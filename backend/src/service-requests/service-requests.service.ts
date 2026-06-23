import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { enforceClosedTicketPolicy } from '../common/ticket-status.policy';
import { PrismaService } from '../prisma/prisma.service';
import { addSlaMinutes } from '../sla/sla-calendar';
import { SlaService } from '../sla/sla.service';
import { CreateServiceCategoryDto, CreateServiceCatalogItemDto, CreateServiceRequestDto, UpdateServiceCatalogItemDto } from './dto/service-catalog.dto';
import { AddCommentDto, AssignIncidentDto } from '../incidents/dto/incident-actions.dto';

const serviceRequestInclude = {
  status: true,
  priority: true,
  ticketType: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  serviceRequest: { include: { catalogItem: { include: { category: true } } } },
  activities: { include: { createdBy: { select: { id: true, name: true } }, activityType: true }, orderBy: { createdAt: 'desc' as const } },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService, private readonly slaService: SlaService) {}

  listCatalog(user: AuthUser) {
    return this.prisma.serviceCatalogCategory.findMany({
      where: { organizationId: user.organizationId, active: true },
      include: {
        items: {
          where: { active: true },
          include: { defaultAssignmentGroup: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(user: AuthUser, dto: CreateServiceCategoryDto) {
    requireServiceDeskRole(user);
    return this.prisma.serviceCatalogCategory.create({
      data: { organizationId: user.organizationId, name: dto.name, description: dto.description },
    });
  }

  async createCatalogItem(user: AuthUser, dto: CreateServiceCatalogItemDto) {
    requireServiceDeskRole(user);
    await this.ensureCategory(user, dto.categoryId);
    if (dto.defaultAssignmentGroupId) await this.ensureGroup(user, dto.defaultAssignmentGroupId);
    return this.prisma.serviceCatalogItem.create({
      data: {
        organizationId: user.organizationId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        defaultAssignmentGroupId: dto.defaultAssignmentGroupId,
        formSchema: (dto.formSchema ?? []) as Prisma.InputJsonValue,
      },
      include: { category: true, defaultAssignmentGroup: { select: { id: true, name: true } } },
    });
  }

  async updateCatalogItem(user: AuthUser, id: string, dto: UpdateServiceCatalogItemDto) {
    requireServiceDeskRole(user);
    const item = await this.prisma.serviceCatalogItem.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!item) throw new NotFoundException('Service catalog item not found');
    if (dto.defaultAssignmentGroupId) await this.ensureGroup(user, dto.defaultAssignmentGroupId);
    return this.prisma.serviceCatalogItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        defaultAssignmentGroupId: dto.defaultAssignmentGroupId,
        formSchema: dto.formSchema === undefined ? undefined : (dto.formSchema as Prisma.InputJsonValue),
        active: dto.active,
        updatedAt: new Date(),
      },
      include: { category: true, defaultAssignmentGroup: { select: { id: true, name: true } } },
    });
  }

  async createRequest(user: AuthUser, dto: CreateServiceRequestDto) {
    const [dbUser, status, type, priority, item] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'SERVICE_REQUEST' } }),
      this.prisma.priority.findUnique({ where: { name: 'MEDIUM' } }),
      this.prisma.serviceCatalogItem.findFirst({ where: { id: dto.catalogItemId, organizationId: user.organizationId, active: true } }),
    ]);
    if (!dbUser) throw new BadRequestException('Authenticated user does not belong to this organization');
    if (!status || !type || !priority) throw new BadRequestException('Required lookup data is missing');
    if (!item) throw new BadRequestException('Service catalog item is not available');

    const matchingSlas = await this.prisma.slaDefinition.findMany({
      where: { organizationId: user.organizationId, active: true, OR: [{ ticketTypeId: type.id }, { ticketTypeId: null }], AND: [{ OR: [{ priorityId: priority.id }, { priorityId: null }] }] },
      include: { calendar: true },
    });
    const slaDefinition = matchingSlas.sort((a, b) => ((b.priorityId ? 2 : 0) + (b.ticketTypeId ? 1 : 0) + b.version / 1000) - ((a.priorityId ? 2 : 0) + (a.ticketTypeId ? 1 : 0) + a.version / 1000))[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ticket_number:REQ'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1)::integer AS next
        FROM tickets
        WHERE ticket_number ~ '^REQ[0-9]{6}$'
      `;
      const ticketNumber = `REQ${sequence.next.toString().padStart(6, '0')}`;
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
          assignmentGroupId: item.defaultAssignmentGroupId,
          serviceRequest: { create: { catalogItemId: item.id, requestedForId: user.id, requestDetails: (dto.requestDetails ?? {}) as Prisma.InputJsonValue } },
        },
        include: serviceRequestInclude,
      });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE_SERVICE_REQUEST', newValue: { ticketNumber: ticket.ticketNumber, title: ticket.title, catalogItemId: item.id }, changedById: user.id } });
      if (slaDefinition) {
        const startedAt = new Date();
        const dueDates = { responseDueAt: addSlaMinutes(startedAt, slaDefinition.responseTargetMinutes, slaDefinition.calendar), resolutionDueAt: addSlaMinutes(startedAt, slaDefinition.resolutionTargetMinutes, slaDefinition.calendar) };
        await tx.ticketSla.create({ data: { ticketId: ticket.id, slaDefinitionId: slaDefinition.id, definitionName: slaDefinition.name, definitionVersion: slaDefinition.version, responseTargetMinutes: slaDefinition.responseTargetMinutes, resolutionTargetMinutes: slaDefinition.resolutionTargetMinutes, startedAt, ...dueDates, events: { create: { eventType: 'STARTED', details: { calendar: slaDefinition.calendar.name, calendarType: slaDefinition.calendar.calendarType } } } } });
      }
      return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: serviceRequestInclude });
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        ticketType: { name: 'SERVICE_REQUEST' },
        ...employeeTicketScope(user),
      },
      include: serviceRequestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId: user.organizationId, ticketType: { name: 'SERVICE_REQUEST' }, ...employeeTicketScope(user) },
      include: serviceRequestInclude,
    });
    if (!ticket) throw new NotFoundException('Service request not found');
    return ticket;
  }

  async changeStatus(user: AuthUser, id: string, statusName: string) {
    requireServiceDeskRole(user);
    const ticket = await this.findOne(user, id);
    enforceClosedTicketPolicy(user, ticket.status?.name, statusName);
    const status = await this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: statusName } } });
    if (!status) throw new BadRequestException(`Unknown ticket status: ${statusName}`);
    await this.prisma.ticket.update({ where: { id }, data: { statusId: status.id, updatedAt: new Date() } });
    await this.slaService.handleStatusChange(id, statusName);
    return this.findOne(user, id);
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
      const updated = await tx.ticket.update({ where: { id }, data: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId, updatedAt: new Date() }, include: serviceRequestInclude });
      await tx.auditLog.create({ data: { organizationId: ticket.organizationId, tableName: 'tickets', recordId: id, action: 'ASSIGN', oldValue: { assignmentGroupId: ticket.assignmentGroupId, assignedToId: ticket.assignedToId }, newValue: { assignmentGroupId: dto.assignmentGroupId, assignedToId: dto.assignedToId }, changedById: user.id } });
      return updated;
    });
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

  private async ensureCategory(user: AuthUser, id: string) {
    const category = await this.prisma.serviceCatalogCategory.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!category) throw new BadRequestException('Category does not belong to this organization');
    return category;
  }

  private async ensureGroup(user: AuthUser, id: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId: user.organizationId, active: true } });
    if (!group) throw new BadRequestException('Assignment group does not belong to this organization');
    return group;
  }
}
