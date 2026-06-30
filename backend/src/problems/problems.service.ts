import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { AddCommentDto, AssignIncidentDto } from '../incidents/dto/incident-actions.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeProblemStatusDto, CreateProblemDto, CreateProblemTaskDto, UpdateProblemDto, UpdateProblemTaskDto } from './dto/problem.dto';

const problemInclude = {
  status: true,
  priority: true,
  ticketType: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  ticketConfigurationItems: { include: { configurationItem: { include: { ciType: true } } }, orderBy: { createdAt: 'asc' as const } },
  problem: { include: { tasks: { include: { assignmentGroup: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' as const } } } },
  activities: { include: { createdBy: { select: { id: true, name: true } }, activityType: true }, orderBy: { createdAt: 'desc' as const } },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateProblemDto) {
    requireServiceDeskRole(user);
    await this.validateRiskAcceptance(user.organizationId, dto);
    const [dbUser, status, type, priority, configurationItem] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'PROBLEM' } }),
      this.prisma.priority.findUnique({ where: { name: dto.priority } }),
      dto.configurationItemId ? this.ensureConfigurationItem(user.organizationId, dto.configurationItemId) : Promise.resolve(null),
    ]);
    if (!dbUser) throw new BadRequestException('Authenticated user does not belong to this organization');
    if (!status || !type || !priority) throw new BadRequestException('Required problem lookup data is missing');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ticket_number:PRB'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1)::integer AS next
        FROM tickets
        WHERE ticket_number ~ '^PRB[0-9]{6}$'
      `;
      const ticketNumber = `PRB${sequence.next.toString().padStart(6, '0')}`;
      const ticket = await tx.ticket.create({
        data: {
          organizationId: user.organizationId,
          createdById: user.id,
          ticketNumber,
          title: dto.title,
          description: dto.description,
          statusId: status.id,
          ticketTypeId: type.id,
          priorityId: priority.id,
          problem: { create: { rootCause: dto.rootCause, workaround: dto.workaround, permanentFix: dto.permanentFix, impact: dto.impact, risk: dto.risk, knownError: dto.knownError ?? false } },
        },
        include: problemInclude,
      });
      await tx.$executeRaw`
        UPDATE problems
        SET impact_details=${dto.impactDetails ?? null},
            risk_accepted=${dto.riskAccepted ?? false},
            risk_owner_id=${dto.riskOwnerId ?? null}::uuid,
            risk_accepted_until=${dto.riskAcceptedUntil ? new Date(dto.riskAcceptedUntil) : null},
            risk_acceptance_summary=${dto.riskAcceptanceSummary ?? null}
        WHERE ticket_id=${ticket.id}::uuid
      `;
      if (configurationItem) await tx.ticketConfigurationItem.create({ data: { ticketId: ticket.id, ciId: configurationItem.id } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE_PROBLEM', newValue: { ticketNumber, title: ticket.title }, changedById: user.id } });
      return this.withProblemExtras(this.withConfigurationItem(ticket));
    });
  }

  async findAll(user: AuthUser) {
    const values = await this.prisma.ticket.findMany({ where: { organizationId: user.organizationId, ticketType: { name: 'PROBLEM' }, ...employeeTicketScope(user) }, include: problemInclude, orderBy: { createdAt: 'desc' } });
    return Promise.all(values.map((ticket) => this.withProblemExtras(this.withConfigurationItem(ticket))));
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId: user.organizationId, ticketType: { name: 'PROBLEM' }, ...employeeTicketScope(user) }, include: problemInclude });
    if (!ticket) throw new NotFoundException('Problem not found');
    return this.withProblemExtras(this.withConfigurationItem(ticket));
  }

  async update(user: AuthUser, id: string, dto: UpdateProblemDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertProblemEditable(ticket.status?.name);
    await this.validateRiskAcceptance(ticket.organizationId, dto);
    const priority = dto.priority ? await this.prisma.priority.findUnique({ where: { name: dto.priority } }) : null;
    if (dto.priority && !priority) throw new BadRequestException('Unknown priority');
    const configurationItem = dto.configurationItemId ? await this.ensureConfigurationItem(ticket.organizationId, dto.configurationItemId) : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.problem.update({ where: { ticketId: id }, data: { rootCause: dto.rootCause, workaround: dto.workaround, permanentFix: dto.permanentFix, impact: dto.impact, risk: dto.risk, knownError: dto.knownError } });
      await tx.$executeRaw`
        UPDATE problems
        SET impact_details=COALESCE(${dto.impactDetails ?? null}, impact_details),
            risk_accepted=COALESCE(${dto.riskAccepted ?? null}, risk_accepted),
            risk_owner_id=${dto.riskOwnerId ?? null}::uuid,
            risk_accepted_until=${dto.riskAcceptedUntil ? new Date(dto.riskAcceptedUntil) : null},
            risk_acceptance_summary=${dto.riskAcceptanceSummary ?? null}
        WHERE ticket_id=${id}::uuid
      `;
      const updated = await tx.ticket.update({ where: { id }, data: { title: dto.title, description: dto.description, priorityId: priority?.id, updatedAt: new Date() }, include: problemInclude });
      if (dto.configurationItemId !== undefined) {
        await tx.ticketConfigurationItem.deleteMany({ where: { ticketId: id } });
        if (configurationItem) await tx.ticketConfigurationItem.create({ data: { ticketId: id, ciId: configurationItem.id } });
      }
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'UPDATE_PROBLEM', newValue: dto as Prisma.InputJsonValue, changedById: user.id } });
      return this.withProblemExtras(this.withConfigurationItem(updated));
    });
  }

  async assign(user: AuthUser, id: string, dto: AssignIncidentDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertProblemEditable(ticket.status?.name);
    const group = await this.ensureGroup(ticket.organizationId, dto.assignmentGroupId);
    const membership = await this.prisma.assignmentGroupMember.findUnique({ where: { assignmentGroupId_userId: { assignmentGroupId: dto.assignmentGroupId, userId: dto.assignedToId } } });
    if (!membership) throw new BadRequestException('Assignee must be a member of the assignment group');
    await this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'ASSIGNMENT_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Problem assigned to ${group.name}`, activityTypeId: activityType?.id } });
      await tx.ticket.update({ where: { id }, data: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, updatedAt: new Date() }, include: problemInclude });
    });
    return this.findOne(user, id);
  }

  async changeStatus(user: AuthUser, id: string, dto: ChangeProblemStatusDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertProblemStatusTransitionAllowed(user, ticket.status?.name, dto.status);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: dto.status } } });
    if (!status) throw new BadRequestException(`Unknown ticket status: ${dto.status}`);
    await this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'STATUS_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Problem status changed from ${ticket.status?.name ?? 'unset'} to ${dto.status}`, activityTypeId: activityType?.id } });
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') await tx.problem.update({ where: { ticketId: id }, data: { resolvedAt: new Date() } });
      await tx.ticket.update({ where: { id }, data: { statusId: status.id, updatedAt: new Date() }, include: problemInclude });
    });
    return this.findOne(user, id);
  }

  async addComment(user: AuthUser, id: string, dto: AddCommentDto) {
    const ticket = await this.findOne(user, id);
    if (ticket.status?.name === 'CLOSED') throw new BadRequestException('Closed problems are locked and cannot be edited');
    if (dto.type === 'WORK_NOTE') requireServiceDeskRole(user);
    const activityType = await this.prisma.activityType.findUnique({ where: { name: dto.type } });
    return this.prisma.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: dto.comment, activityTypeId: activityType?.id } });
  }

  async createTask(user: AuthUser, id: string, dto: CreateProblemTaskDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertProblemEditable(ticket.status?.name);
    if (!ticket.problem) throw new NotFoundException('Problem not found');
    if (dto.assignmentGroupId) await this.ensureGroup(ticket.organizationId, dto.assignmentGroupId);
    if (dto.assignedToId) await this.ensureUser(ticket.organizationId, dto.assignedToId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('problem_task_number:PTASK'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(task_number FROM 6) AS INTEGER)), 0) + 1)::integer AS next
        FROM problem_tasks
        WHERE task_number ~ '^PTASK[0-9]{6}$'
      `;
      await tx.problemTask.create({ data: { problemId: ticket.problem!.id, taskNumber: `PTASK${sequence.next.toString().padStart(6, '0')}`, title: dto.title, description: dto.description, assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, createdById: user.id } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Problem task created: ${dto.title}` } });
      await tx.ticket.findUniqueOrThrow({ where: { id }, include: problemInclude });
    });
    return this.findOne(user, id);
  }

  async updateTask(user: AuthUser, id: string, taskId: string, dto: UpdateProblemTaskDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertProblemEditable(ticket.status?.name);
    if (!ticket.problem) throw new NotFoundException('Problem not found');
    const task = await this.prisma.problemTask.findFirst({ where: { id: taskId, problemId: ticket.problem.id } });
    if (!task) throw new NotFoundException('Problem task not found');
    if (dto.assignmentGroupId) await this.ensureGroup(ticket.organizationId, dto.assignmentGroupId);
    if (dto.assignedToId) await this.ensureUser(ticket.organizationId, dto.assignedToId);
    await this.prisma.problemTask.update({ where: { id: taskId }, data: { title: dto.title, description: dto.description, assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, status: dto.status, completedAt: dto.status === 'COMPLETED' ? new Date() : dto.status ? null : undefined, updatedAt: new Date() } });
    await this.prisma.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: dto.workNote?.trim() ? `${task.taskNumber}: ${dto.workNote.trim()}` : `Problem task ${task.taskNumber} updated${dto.status ? ` to ${dto.status}` : ''}` } });
    return this.findOne(user, id);
  }

  private assertProblemStatusTransitionAllowed(user: AuthUser, currentStatus: string | undefined, nextStatus: string) {
    if (currentStatus !== 'CLOSED') return;
    if (nextStatus === 'CLOSED') return;
    if (!user.roles.includes(Roles.Admin) && !user.roles.includes(Roles.ServiceManager)) {
      throw new BadRequestException('Only IT Service Managers and administrators can reopen a closed problem');
    }
  }

  private assertProblemEditable(currentStatus: string | undefined) {
    if (currentStatus === 'CLOSED') throw new BadRequestException('Closed problems are locked and cannot be edited. Reopen first.');
  }

  private async ensureGroup(organizationId: string, id: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId, active: true } });
    if (!group) throw new BadRequestException('Assignment group does not belong to this organization');
    return group;
  }

  private async ensureUser(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, active: true } });
    if (!user) throw new BadRequestException('Assignee must be an active user in this organization');
    return user;
  }

  private async ensureConfigurationItem(organizationId: string, id: string) {
    const item = await this.prisma.configurationItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new BadRequestException('Configuration item does not belong to this organization');
    return item;
  }

  private async validateRiskAcceptance(organizationId: string, dto: Partial<CreateProblemDto & UpdateProblemDto>) {
    if (!dto.riskAccepted) return;
    if (!dto.riskOwnerId || !dto.riskAcceptedUntil || !dto.riskAcceptanceSummary?.trim()) {
      throw new BadRequestException('Risk owner, accepted till date, and acceptance summary are mandatory when risk is accepted');
    }
    await this.ensureUser(organizationId, dto.riskOwnerId);
  }

  private async withProblemExtras<T extends { id: string; problem?: Record<string, unknown> | null }>(ticket: T) {
    if (!ticket.problem) return ticket;
    const [extra] = await this.prisma.$queryRaw<{
      impact_details: string | null;
      risk_accepted: boolean;
      risk_owner_id: string | null;
      risk_accepted_until: Date | null;
      risk_acceptance_summary: string | null;
      risk_owner_name: string | null;
      risk_owner_email: string | null;
    }[]>`
      SELECT p.impact_details,
             p.risk_accepted,
             p.risk_owner_id,
             p.risk_accepted_until,
             p.risk_acceptance_summary,
             u.name AS risk_owner_name,
             u.email AS risk_owner_email
      FROM problems p
      LEFT JOIN users u ON u.id = p.risk_owner_id
      WHERE p.ticket_id=${ticket.id}::uuid
    `;
    if (!extra) return ticket;
    return {
      ...ticket,
      problem: {
        ...ticket.problem,
        impactDetails: extra.impact_details ?? undefined,
        riskAccepted: extra.risk_accepted,
        riskOwnerId: extra.risk_owner_id ?? undefined,
        riskAcceptedUntil: extra.risk_accepted_until?.toISOString(),
        riskAcceptanceSummary: extra.risk_acceptance_summary ?? undefined,
        riskOwner: extra.risk_owner_id ? { id: extra.risk_owner_id, name: extra.risk_owner_name, email: extra.risk_owner_email } : undefined,
      },
    };
  }

  private withConfigurationItem<T extends { ticketConfigurationItems?: { configurationItem: { id: string; name: string; ciType?: { name: string } | null } }[] }>(ticket: T) {
    const item = ticket.ticketConfigurationItems?.[0]?.configurationItem;
    return { ...ticket, configurationItem: item ? { id: item.id, name: item.name, ciType: item.ciType?.name } : undefined };
  }
}
