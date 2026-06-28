import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { enforceClosedTicketPolicy } from '../common/ticket-status.policy';
import { AddCommentDto, AssignIncidentDto, ChangeStatusDto } from '../incidents/dto/incident-actions.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChangeDto, UpdateChangeDto } from './dto/change.dto';

const changeInclude = {
  status: true,
  priority: true,
  ticketType: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  change: { include: { requestedBy: { select: { id: true, name: true, email: true } } } },
  activities: { include: { createdBy: { select: { id: true, name: true } }, activityType: true }, orderBy: { createdAt: 'desc' as const } },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class ChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateChangeDto) {
    requireServiceDeskRole(user);
    const [dbUser, status, type, priority] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'CHANGE' } }),
      this.prisma.priority.findUnique({ where: { name: dto.priority } }),
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
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE_CHANGE', newValue: { ticketNumber, title: ticket.title }, changedById: user.id } });
      return ticket;
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.ticket.findMany({ where: { organizationId: user.organizationId, ticketType: { name: 'CHANGE' }, ...employeeTicketScope(user) }, include: changeInclude, orderBy: { createdAt: 'desc' } });
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId: user.organizationId, ticketType: { name: 'CHANGE' }, ...employeeTicketScope(user) }, include: changeInclude });
    if (!ticket) throw new NotFoundException('Change not found');
    return ticket;
  }

  async update(user: AuthUser, id: string, dto: UpdateChangeDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const priority = dto.priority ? await this.prisma.priority.findUnique({ where: { name: dto.priority } }) : null;
    if (dto.priority && !priority) throw new BadRequestException('Unknown priority');
    return this.prisma.$transaction(async (tx) => {
      await tx.change.update({ where: { ticketId: id }, data: this.changeUpdateData(dto) });
      const updated = await tx.ticket.update({ where: { id }, data: { title: dto.title, description: dto.description, priorityId: priority?.id, updatedAt: new Date() }, include: changeInclude });
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'UPDATE_CHANGE', newValue: dto as Prisma.InputJsonValue, changedById: user.id } });
      return updated;
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

  async changeStatus(user: AuthUser, id: string, dto: ChangeStatusDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    enforceClosedTicketPolicy(user, ticket.status?.name, dto.status);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: dto.status } } });
    if (!status) throw new BadRequestException(`Unknown ticket status: ${dto.status}`);
    return this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'STATUS_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Change status changed from ${ticket.status?.name ?? 'unset'} to ${dto.status}`, activityTypeId: activityType?.id } });
      if (dto.status === 'IN_PROGRESS') await tx.change.update({ where: { ticketId: id }, data: { actualStart: new Date() } });
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') await tx.change.update({ where: { ticketId: id }, data: { actualEnd: new Date() } });
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
      backoutPlan: dto.backoutPlan,
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
      backoutPlan: dto.backoutPlan,
      testPlan: dto.testPlan,
    };
  }

  private async ensureGroup(organizationId: string, id: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId, active: true } });
    if (!group) throw new BadRequestException('Assignment group does not belong to this organization');
    return group;
  }
}
