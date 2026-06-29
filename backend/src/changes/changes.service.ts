import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { AddCommentDto, AssignIncidentDto } from '../incidents/dto/incident-actions.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeChangeStatusDto, CreateChangeDto, UpdateChangeDto } from './dto/change.dto';

const changeInclude = {
  status: true,
  priority: true,
  ticketType: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  ticketConfigurationItems: { include: { configurationItem: { include: { ciType: true } } }, orderBy: { createdAt: 'asc' as const } },
  change: { include: { requestedBy: { select: { id: true, name: true, email: true } }, approvals: { include: { approver: { select: { id: true, name: true, email: true } } }, orderBy: [{ sequence: 'asc' as const }, { createdAt: 'asc' as const }] } } },
  activities: { include: { createdBy: { select: { id: true, name: true } }, activityType: true }, orderBy: { createdAt: 'desc' as const } },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class ChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateChangeDto) {
    requireServiceDeskRole(user);
    const [dbUser, status, type, priority, configurationItem] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'NEW' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'CHANGE' } }),
      this.prisma.priority.findUnique({ where: { name: dto.priority } }),
      dto.configurationItemId ? this.ensureConfigurationItem(user.organizationId, dto.configurationItemId) : Promise.resolve(null),
    ]);
    if (!dbUser) throw new BadRequestException('Authenticated user does not belong to this organization');
    if (!status || !type || !priority) throw new BadRequestException('Required change lookup data is missing');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ticket_number:CHG'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1)::integer AS next
        FROM tickets
        WHERE ticket_number ~ '^CHG[0-9]{6}$'
      `;
      const ticketNumber = `CHG${sequence.next.toString().padStart(6, '0')}`;
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
          change: { create: this.changeCreateData(user.id, dto) },
        },
        include: changeInclude,
      });
      if (configurationItem) await tx.ticketConfigurationItem.create({ data: { ticketId: ticket.id, ciId: configurationItem.id } });
      await this.createApprovalSnapshot(tx, user.organizationId, ticket.change!.id, user.id);
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE_CHANGE', newValue: { ticketNumber, title: ticket.title }, changedById: user.id } });
      const withApprovals = await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: changeInclude });
      return this.withConfigurationItem(withApprovals);
    });
  }

  async findAll(user: AuthUser) {
    const values = await this.prisma.ticket.findMany({ where: { organizationId: user.organizationId, ticketType: { name: 'CHANGE' }, ...employeeTicketScope(user) }, include: changeInclude, orderBy: { createdAt: 'desc' } });
    return values.map((ticket) => this.withConfigurationItem(ticket));
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId: user.organizationId, ticketType: { name: 'CHANGE' }, ...employeeTicketScope(user) }, include: changeInclude });
    if (!ticket) throw new NotFoundException('Change not found');
    return this.withConfigurationItem(ticket);
  }

  async update(user: AuthUser, id: string, dto: UpdateChangeDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const priority = dto.priority ? await this.prisma.priority.findUnique({ where: { name: dto.priority } }) : null;
    if (dto.priority && !priority) throw new BadRequestException('Unknown priority');
    const configurationItem = dto.configurationItemId ? await this.ensureConfigurationItem(ticket.organizationId, dto.configurationItemId) : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.change.update({ where: { ticketId: id }, data: this.changeUpdateData(dto) });
      const updated = await tx.ticket.update({ where: { id }, data: { title: dto.title, description: dto.description, priorityId: priority?.id, updatedAt: new Date() }, include: changeInclude });
      if (dto.configurationItemId !== undefined) {
        await tx.ticketConfigurationItem.deleteMany({ where: { ticketId: id } });
        if (configurationItem) await tx.ticketConfigurationItem.create({ data: { ticketId: id, ciId: configurationItem.id } });
      }
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'UPDATE_CHANGE', newValue: dto as Prisma.InputJsonValue, changedById: user.id } });
      return this.withConfigurationItem(updated);
    });
  }

  async assign(user: AuthUser, id: string, dto: AssignIncidentDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const group = await this.ensureGroup(ticket.organizationId, dto.assignmentGroupId);
    const membership = await this.prisma.assignmentGroupMember.findUnique({ where: { assignmentGroupId_userId: { assignmentGroupId: dto.assignmentGroupId, userId: dto.assignedToId } } });
    if (!membership) throw new BadRequestException('Assignee must be a member of the assignment group');
    return this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'ASSIGNMENT_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Change assigned to ${group.name}`, activityTypeId: activityType?.id } });
      return tx.ticket.update({ where: { id }, data: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, updatedAt: new Date() }, include: changeInclude });
    });
  }

  async changeStatus(user: AuthUser, id: string, dto: ChangeChangeStatusDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    this.assertChangeStatusTransitionAllowed(user, ticket.status?.name, dto.status);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: dto.status } } });
    if (!status) throw new BadRequestException(`Unknown ticket status: ${dto.status}`);
    return this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'STATUS_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Change status changed from ${ticket.status?.name ?? 'unset'} to ${dto.status}`, activityTypeId: activityType?.id } });
      if (dto.status === 'IMPLEMENT') await tx.change.update({ where: { ticketId: id }, data: { actualStart: new Date() } });
      if (dto.status === 'CLOSED') await tx.change.update({ where: { ticketId: id }, data: { actualEnd: new Date() } });
      return tx.ticket.update({ where: { id }, data: { statusId: status.id, updatedAt: new Date() }, include: changeInclude });
    });
  }

  async addComment(user: AuthUser, id: string, dto: AddCommentDto) {
    await this.findOne(user, id);
    if (dto.type === 'WORK_NOTE') requireServiceDeskRole(user);
    const activityType = await this.prisma.activityType.findUnique({ where: { name: dto.type } });
    return this.prisma.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: dto.comment, activityTypeId: activityType?.id } });
  }

  private changeCreateData(userId: string, dto: CreateChangeDto): Prisma.ChangeUncheckedCreateWithoutTicketInput {
    return {
      requestedById: userId,
      changeType: dto.changeType,
      risk: dto.risk,
      impact: dto.impact,
      plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      implementationPlan: dto.implementationPlan,
      rollbackPlan: dto.rollbackPlan,
      testPlan: dto.testPlan,
    };
  }

  private changeUpdateData(dto: UpdateChangeDto): Prisma.ChangeUncheckedUpdateInput {
    return {
      changeType: dto.changeType,
      risk: dto.risk,
      impact: dto.impact,
      plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      implementationPlan: dto.implementationPlan,
      rollbackPlan: dto.rollbackPlan,
      testPlan: dto.testPlan,
    };
  }

  private async ensureGroup(organizationId: string, id: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId, active: true } });
    if (!group) throw new BadRequestException('Assignment group does not belong to this organization');
    return group;
  }

  private async ensureConfigurationItem(organizationId: string, id: string) {
    const item = await this.prisma.configurationItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new BadRequestException('Configuration item does not belong to this organization');
    return item;
  }

  private assertChangeStatusTransitionAllowed(user: AuthUser, currentStatus: string | undefined, nextStatus: string) {
    if (currentStatus !== 'CLOSED') return;
    if (nextStatus === 'CLOSED') return;
    if (!user.roles.includes(Roles.Admin) && !user.roles.includes(Roles.ServiceManager)) {
      throw new BadRequestException('Only IT Service Managers and administrators can reopen a closed change');
    }
  }

  private async createApprovalSnapshot(tx: Prisma.TransactionClient, organizationId: string, changeId: string, requestedById: string) {
    const rules = await tx.changeApprovalRule.findMany({
      where: { organizationId, active: true },
      include: { approvalGroup: { include: { members: { include: { user: true } } } } },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    });
    for (const rule of rules) {
      if (this.isGroupBackedApproval(rule.approvalType)) {
        const members = rule.approvalGroup?.members.filter((member) => member.user.active) ?? [];
        if (members.length === 0) {
          await tx.changeApproval.create({ data: { changeId, approvalRuleId: rule.id, sequence: rule.sequence, approvalType: rule.approvalType } });
        } else {
          await tx.changeApproval.createMany({
            data: members.map((member) => ({ changeId, approvalRuleId: rule.id, sequence: rule.sequence, approvalType: rule.approvalType, approverId: member.userId })),
          });
        }
      } else if (rule.approvalType === 'MANAGER') {
        const requester = await tx.user.findFirst({ where: { id: requestedById, organizationId }, select: { managerId: true } });
        await tx.changeApproval.create({ data: { changeId, approvalRuleId: rule.id, sequence: rule.sequence, approvalType: rule.approvalType, approverId: requester?.managerId } });
      } else {
        await tx.changeApproval.create({ data: { changeId, approvalRuleId: rule.id, sequence: rule.sequence, approvalType: rule.approvalType, approverId: rule.specificApproverId } });
      }
    }
  }

  private isGroupBackedApproval(approvalType: string) {
    return ['GROUP', 'CAB', 'SECURITY', 'ITAM'].includes(approvalType);
  }

  private withConfigurationItem<T extends { ticketConfigurationItems?: { configurationItem: { id: string; name: string; ciType?: { name: string } | null } }[] }>(ticket: T) {
    const item = ticket.ticketConfigurationItems?.[0]?.configurationItem;
    return { ...ticket, configurationItem: item ? { id: item.id, name: item.name, ciType: item.ciType?.name } : undefined };
  }
}
