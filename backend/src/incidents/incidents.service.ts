import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AddCommentDto, AssignIncidentDto, ChangeStatusDto, ResolveIncidentDto } from './dto/incident-actions.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { enforceClosedTicketPolicy } from '../common/ticket-status.policy';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { addSlaMinutes } from '../sla/sla-calendar';
import { SlaService } from '../sla/sla.service';

const incidentInclude = {
  status: true,
  priority: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  incident: true,
  activities: { include: { createdBy: { select: { id: true, name: true } }, activityType: true }, orderBy: { createdAt: 'desc' as const } },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService, private readonly slaService: SlaService) {}

  async create(user: AuthUser, dto: CreateIncidentDto) {
    const [dbUser, status, type, priority] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'INCIDENT' } }),
      this.prisma.priority.findUnique({ where: { name: dto.priority } }),
    ]);
    if (!dbUser) throw new BadRequestException('Authenticated user does not belong to this organization');
    if (!status || !type || !priority) throw new BadRequestException('Required lookup data is missing');
    const matchingSlas = await this.prisma.slaDefinition.findMany({
      where: { organizationId: user.organizationId, active: true, OR: [{ ticketTypeId: type.id }, { ticketTypeId: null }], AND: [{ OR: [{ priorityId: priority.id }, { priorityId: null }] }] },
      include: { calendar: true },
    });
    const slaDefinition = matchingSlas.sort((a, b) => ((b.priorityId ? 2 : 0) + (b.ticketTypeId ? 1 : 0) + b.version / 1000) - ((a.priorityId ? 2 : 0) + (a.ticketTypeId ? 1 : 0) + a.version / 1000))[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ticket_number:INC'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1)::integer AS next
        FROM tickets
        WHERE ticket_number ~ '^INC[0-9]{6}$'
      `;
      const ticketNumber = `INC${sequence.next.toString().padStart(6, '0')}`;
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
          incident: { create: { impact: dto.impact, urgency: dto.urgency, affectedService: dto.affectedService } },
        },
        include: incidentInclude,
      });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE', newValue: { ticketNumber: ticket.ticketNumber, title: ticket.title }, changedById: user.id } });
      if (slaDefinition) {
        const startedAt = new Date();
        const dueDates = { responseDueAt: addSlaMinutes(startedAt, slaDefinition.responseTargetMinutes, slaDefinition.calendar), resolutionDueAt: addSlaMinutes(startedAt, slaDefinition.resolutionTargetMinutes, slaDefinition.calendar) };
        await tx.ticketSla.create({ data: { ticketId: ticket.id, slaDefinitionId: slaDefinition.id, definitionName: slaDefinition.name, definitionVersion: slaDefinition.version, responseTargetMinutes: slaDefinition.responseTargetMinutes, resolutionTargetMinutes: slaDefinition.resolutionTargetMinutes, startedAt, ...dueDates, events: { create: { eventType: 'STARTED', details: { calendar: slaDefinition.calendar.name, calendarType: slaDefinition.calendar.calendarType } } } } });
      }
      return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: incidentInclude });
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        ticketType: { name: 'INCIDENT' },
        ...employeeTicketScope(user),
      },
      include: incidentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ticketType: { name: 'INCIDENT' },
        ...employeeTicketScope(user),
      },
      include: incidentInclude,
    });
    if (!ticket) throw new NotFoundException('Incident not found');
    return ticket;
  }

  async assign(user: AuthUser, id: string, dto: AssignIncidentDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id: dto.assignmentGroupId, organizationId: ticket.organizationId, active: true } });
    if (!group) throw new BadRequestException('Assignment group does not belong to this organization');
    const membership = await this.prisma.assignmentGroupMember.findUnique({ where: { assignmentGroupId_userId: { assignmentGroupId: dto.assignmentGroupId, userId: dto.assignedToId } } });
    if (!membership) throw new BadRequestException('Assignee must be a member of the assignment group');
    return this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'ASSIGNMENT_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Assigned to ${group.name}`, activityTypeId: activityType?.id } });
      const updated = await tx.ticket.update({ where: { id }, data: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, updatedAt: new Date() }, include: incidentInclude });
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'ASSIGN', oldValue: { assignmentGroupId: ticket.assignmentGroupId, assignedToId: ticket.assignedToId }, newValue: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId }, changedById: user.id } });
      return updated;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateIncidentDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const priority = dto.priority
      ? await this.prisma.priority.findUnique({ where: { name: dto.priority } })
      : null;
    if (dto.priority && !priority) throw new BadRequestException('Unknown priority');

    return this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { ticketId: id },
        data: { impact: dto.impact, urgency: dto.urgency, affectedService: dto.affectedService },
      });
      const updated = await tx.ticket.update({
        where: { id },
        data: { title: dto.title, description: dto.description, priorityId: priority?.id, updatedAt: new Date() },
        include: incidentInclude,
      });
      await tx.auditLog.create({
        data: {
          organizationId: ticket.organizationId,
          tableName: 'tickets',
          recordId: id,
          action: 'UPDATE',
          oldValue: { title: ticket.title, description: ticket.description, priority: ticket.priority?.name },
          newValue: {
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            impact: dto.impact,
            urgency: dto.urgency,
            affectedService: dto.affectedService,
          },
          changedById: user.id,
        },
      });
      return updated;
    });
  }

  async changeStatus(user: AuthUser, id: string, dto: ChangeStatusDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    enforceClosedTicketPolicy(user, ticket.status?.name, dto.status);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: dto.status } } });
    if (!status) throw new BadRequestException(`Unknown ticket status: ${dto.status}`);
    await this.prisma.$transaction(async (tx) => {
      const activityType = await tx.activityType.findUnique({ where: { name: 'STATUS_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Status changed from ${ticket.status?.name ?? 'unset'} to ${dto.status}`, activityTypeId: activityType?.id } });
      const updated = await tx.ticket.update({ where: { id }, data: { statusId: status.id, updatedAt: new Date() }, include: incidentInclude });
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'STATUS_CHANGE', oldValue: { status: ticket.status?.name }, newValue: { status: dto.status }, changedById: user.id } });
      return updated;
    });
    await this.slaService.handleStatusChange(id, dto.status);
    return this.findOne(user, id);
  }

  async addComment(user: AuthUser, id: string, dto: AddCommentDto) {
    await this.findOne(user, id);
    if (dto.type === 'WORK_NOTE') requireServiceDeskRole(user);
    const activityType = await this.prisma.activityType.findUnique({ where: { name: dto.type } });
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: dto.comment, activityTypeId: activityType?.id } });
      if (dto.type === 'WORK_NOTE') {
        const pending = await tx.ticketSla.findMany({ where: { ticketId: id, firstRespondedAt: null } });
        const now = new Date();
        for (const sla of pending) {
          await tx.ticketSla.update({ where: { id: sla.id }, data: { firstRespondedAt: now, updatedAt: now } });
          await tx.slaEvent.create({ data: { ticketSlaId: sla.id, eventType: now <= sla.responseDueAt ? 'RESPONSE_MET' : 'RESPONSE_BREACHED', eventAt: now } });
        }
      }
      return activity;
    });
  }

  async resolve(user: AuthUser, id: string, dto: ResolveIncidentDto) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'RESOLVED' } } });
    if (!status) throw new BadRequestException('RESOLVED lookup status is missing');
    return this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { ticketId: id }, data: { resolutionNotes: dto.resolutionNotes, resolvedAt: new Date() } });
      const activityType = await tx.activityType.findUnique({ where: { name: 'STATUS_CHANGE' } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Incident resolved: ${dto.resolutionNotes}`, activityTypeId: activityType?.id } });
      const updated = await tx.ticket.update({ where: { id }, data: { statusId: status.id, updatedAt: new Date() }, include: incidentInclude });
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'RESOLVE', oldValue: { status: ticket.status?.name }, newValue: { status: 'RESOLVED', resolutionNotes: dto.resolutionNotes }, changedById: user.id } });
      const activeSlas = await tx.ticketSla.findMany({ where: { ticketId: id, resolvedAt: null } });
      const resolvedAt = new Date();
      for (const sla of activeSlas) {
        const slaStatus = resolvedAt <= sla.resolutionDueAt ? 'MET' : 'BREACHED';
        await tx.ticketSla.update({ where: { id: sla.id }, data: { resolvedAt, status: slaStatus, updatedAt: resolvedAt } });
        await tx.slaEvent.create({ data: { ticketSlaId: sla.id, eventType: slaStatus === 'MET' ? 'RESOLUTION_MET' : 'RESOLUTION_BREACHED', eventAt: resolvedAt } });
      }
      return updated;
    });
  }
}
