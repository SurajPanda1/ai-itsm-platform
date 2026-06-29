import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { employeeTicketScope, requireServiceDeskRole } from '../common/ticket-access.policy';
import { enforceClosedTicketPolicy } from '../common/ticket-status.policy';
import { PrismaService } from '../prisma/prisma.service';
import { addSlaMinutes } from '../sla/sla-calendar';
import { SlaService } from '../sla/sla.service';
import { CreateApprovalRuleDto, CreateServiceCategoryDto, CreateServiceCatalogItemDto, CreateServiceRequestDto, DecideApprovalDto, UpdateApprovalRuleDto, UpdateRequestTaskDto, UpdateServiceCategoryDto, UpdateServiceCatalogItemDto } from './dto/service-catalog.dto';
import { AddCommentDto, AssignIncidentDto } from '../incidents/dto/incident-actions.dto';

const serviceRequestInclude = {
  status: true,
  priority: true,
  ticketType: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  serviceRequest: { include: { requestedFor: { select: { id: true, name: true, email: true } }, catalogItem: { include: { category: true, approvalRules: { where: { active: true }, orderBy: { sequence: 'asc' as const } } } }, approvals: { include: { approver: { select: { id: true, name: true, email: true } } }, orderBy: { sequence: 'asc' as const } }, tasks: { include: { assignmentGroup: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' as const } } } },
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
          include: { defaultAssignmentGroup: { select: { id: true, name: true } }, approvalRules: { where: { active: true }, include: { approvalGroup: { select: { id: true, name: true } }, specificApprover: { select: { id: true, name: true, email: true } } }, orderBy: { sequence: 'asc' } } },
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

  async updateCategory(user: AuthUser, id: string, dto: UpdateServiceCategoryDto) {
    requireServiceDeskRole(user);
    const category = await this.prisma.serviceCatalogCategory.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!category) throw new NotFoundException('Service catalog category not found');
    return this.prisma.serviceCatalogCategory.update({
      where: { id },
      data: { name: dto.name, description: dto.description, updatedAt: new Date() },
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
        taskTemplates: (dto.taskTemplates ?? []) as Prisma.InputJsonValue,
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
        taskTemplates: dto.taskTemplates === undefined ? undefined : (dto.taskTemplates as Prisma.InputJsonValue),
        active: dto.active,
        updatedAt: new Date(),
      },
      include: { category: true, defaultAssignmentGroup: { select: { id: true, name: true } } },
    });
  }

  async createApprovalRule(user: AuthUser, dto: CreateApprovalRuleDto) {
    requireServiceDeskRole(user);
    const item = await this.prisma.serviceCatalogItem.findFirst({ where: { id: dto.catalogItemId, organizationId: user.organizationId } });
    if (!item) throw new BadRequestException('Service catalog item does not belong to this organization');
    if (dto.approvalType === 'GROUP' && !dto.approvalGroupId) throw new BadRequestException('Approval group is required for group approval');
    if (dto.approvalType === 'SPECIFIC_USER' && !dto.specificApproverId) throw new BadRequestException('Specific approver is required');
    if (dto.approvalGroupId) {
      const group = await this.prisma.assignmentGroup.findFirst({ where: { id: dto.approvalGroupId, organizationId: user.organizationId, active: true, groupType: { in: ['APPROVAL', 'BOTH'] } } });
      if (!group) throw new BadRequestException('Approval group must be active and typed as Approval or Both');
    }
    if (dto.specificApproverId) {
      const approver = await this.prisma.user.findFirst({ where: { id: dto.specificApproverId, organizationId: user.organizationId, active: true } });
      if (!approver) throw new BadRequestException('Approver must be an active user in this organization');
    }
    return this.prisma.serviceApprovalRule.create({
      data: {
        catalogItemId: dto.catalogItemId,
        sequence: dto.sequence,
        approvalType: dto.approvalType,
        approvalGroupId: dto.approvalGroupId,
        specificApproverId: dto.specificApproverId,
      },
    });
  }

  async updateApprovalRule(user: AuthUser, id: string, dto: UpdateApprovalRuleDto) {
    requireServiceDeskRole(user);
    const rule = await this.prisma.serviceApprovalRule.findFirst({ where: { id, catalogItem: { organizationId: user.organizationId } } });
    if (!rule) throw new NotFoundException('Approval rule not found');
    const approvalType = dto.approvalType ?? rule.approvalType;
    if (approvalType === 'GROUP') {
      const groupId = dto.approvalGroupId ?? rule.approvalGroupId;
      if (!groupId) throw new BadRequestException('Approval group is required for group approval');
      const group = await this.prisma.assignmentGroup.findFirst({ where: { id: groupId, organizationId: user.organizationId, active: true, groupType: { in: ['APPROVAL', 'BOTH'] } } });
      if (!group) throw new BadRequestException('Approval group must be active and typed as Approval or Both');
    }
    if (approvalType === 'SPECIFIC_USER') {
      const approverId = dto.specificApproverId ?? rule.specificApproverId;
      if (!approverId) throw new BadRequestException('Specific approver is required');
      const approver = await this.prisma.user.findFirst({ where: { id: approverId, organizationId: user.organizationId, active: true } });
      if (!approver) throw new BadRequestException('Approver must be an active user in this organization');
    }
    return this.prisma.serviceApprovalRule.update({
      where: { id },
      data: {
        sequence: dto.sequence,
        approvalType: dto.approvalType,
        approvalGroupId: approvalType === 'GROUP' ? dto.approvalGroupId ?? rule.approvalGroupId : null,
        specificApproverId: approvalType === 'SPECIFIC_USER' ? dto.specificApproverId ?? rule.specificApproverId : null,
        active: dto.active,
        updatedAt: new Date(),
      },
      include: { approvalGroup: { select: { id: true, name: true } }, specificApprover: { select: { id: true, name: true, email: true } } },
    });
  }

  async createRequest(user: AuthUser, dto: CreateServiceRequestDto) {
    const [dbUser, requestedFor, openStatus, approvalStatus, type, priority, item] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: user.id, organizationId: user.organizationId } }),
      this.prisma.user.findFirst({ where: { id: dto.requestedForId ?? user.id, organizationId: user.organizationId, active: true } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } }),
      this.prisma.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'AWAITING_APPROVAL' } } }),
      this.prisma.ticketType.findUnique({ where: { name: 'SERVICE_REQUEST' } }),
      this.prisma.priority.findUnique({ where: { name: 'MEDIUM' } }),
      this.prisma.serviceCatalogItem.findFirst({ where: { id: dto.catalogItemId, organizationId: user.organizationId, active: true }, include: { approvalRules: { where: { active: true }, orderBy: { sequence: 'asc' }, include: { approvalGroup: true, specificApprover: true } } } }),
    ]);
    if (!dbUser) throw new BadRequestException('Authenticated user does not belong to this organization');
    if (!requestedFor) throw new BadRequestException('Created for user must be active and in this organization');
    if (!openStatus || !type || !priority) throw new BadRequestException('Required lookup data is missing');
    if (!item) throw new BadRequestException('Service catalog item is not available');
    const resolvedApprovalRules = item.approvalRules.flatMap((rule) => {
      const approverId =
        rule.approvalType === 'MANAGER'
          ? dbUser.managerId
          : rule.approvalType === 'GROUP'
            ? rule.approvalGroup?.managerId
            : rule.specificApproverId;
      if (!approverId && rule.approvalType === 'MANAGER' && dbUser.managerRequiredExempt) return [];
      if (!approverId) throw new BadRequestException(`Approval rule ${rule.sequence} does not resolve to an approver`);
      return [{ rule, approverId }];
    });
    const requiresApproval = resolvedApprovalRules.length > 0;
    if (requiresApproval && !approvalStatus) throw new BadRequestException('AWAITING_APPROVAL status lookup is missing');

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
          statusId: requiresApproval ? approvalStatus!.id : openStatus.id,
          ticketTypeId: type.id,
          priorityId: priority.id,
          assignmentGroupId: item.defaultAssignmentGroupId,
          serviceRequest: { create: { catalogItemId: item.id, requestedForId: requestedFor.id, requestDetails: (dto.requestDetails ?? {}) as Prisma.InputJsonValue } },
        },
        include: serviceRequestInclude,
      });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, tableName: 'tickets', recordId: ticket.id, action: 'CREATE_SERVICE_REQUEST', newValue: { ticketNumber: ticket.ticketNumber, title: ticket.title, catalogItemId: item.id }, changedById: user.id } });
      if (requiresApproval) {
        for (const { rule, approverId } of resolvedApprovalRules) {
          await tx.serviceApproval.create({ data: { serviceRequestId: ticket.serviceRequest!.id, approvalRuleId: rule.id, sequence: rule.sequence, approvalType: rule.approvalType, approverId } });
        }
      } else {
        await this.createTasksFromTemplates(tx, ticket.serviceRequest!.id, user.id, item.taskTemplates);
      }
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

  async pendingApprovals(user: AuthUser) {
    const approvals = await this.prisma.serviceApproval.findMany({
      where: {
        status: 'PENDING',
        approverId: user.id,
        serviceRequest: { ticket: { organizationId: user.organizationId } },
      },
      include: { serviceRequest: { include: { ticket: { include: serviceRequestInclude } } } },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    });
    const seen = new Set<string>();
    return approvals
      .map((approval) => approval.serviceRequest.ticket)
      .filter((ticket) => {
        if (seen.has(ticket.id)) return false;
        seen.add(ticket.id);
        return true;
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

  async decideApproval(user: AuthUser, id: string, approvalId: string, dto: DecideApprovalDto) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId: user.organizationId, ticketType: { name: 'SERVICE_REQUEST' } }, include: serviceRequestInclude });
    if (!ticket?.serviceRequest) throw new NotFoundException('Service request not found');
    const approval = await this.prisma.serviceApproval.findFirst({ where: { id: approvalId, serviceRequestId: ticket.serviceRequest!.id }, include: { serviceRequest: { include: { catalogItem: true } } } });
    if (!approval) throw new NotFoundException('Approval not found');
    const serviceDesk = ['ADMIN', 'IT_AGENT', 'IT_SERVICE_MANAGER'].some((role) => user.roles.includes(role as any));
    if (approval.approverId !== user.id && !serviceDesk) throw new BadRequestException('You are not allowed to decide this approval');
    if (approval.status !== 'PENDING') throw new BadRequestException('Approval is already decided');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceApproval.update({ where: { id: approvalId }, data: { status: dto.decision, decisionComment: dto.decisionComment, decidedAt: now } });
      await tx.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: `Approval ${dto.decision.toLowerCase()}${dto.decisionComment ? `: ${dto.decisionComment}` : ''}` } });
      if (dto.decision === 'REJECTED') {
        const rejected = await tx.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'REJECTED' } } });
        if (!rejected) throw new BadRequestException('REJECTED status lookup is missing');
        await tx.ticket.update({ where: { id }, data: { statusId: rejected.id, updatedAt: now } });
        return tx.ticket.findUniqueOrThrow({ where: { id }, include: serviceRequestInclude });
      }
      const remaining = await tx.serviceApproval.count({ where: { serviceRequestId: ticket.serviceRequest!.id, status: 'PENDING' } });
      if (remaining === 0) {
        const open = await tx.status.findUnique({ where: { module_name: { module: 'TICKET', name: 'OPEN' } } });
        if (!open) throw new BadRequestException('OPEN status lookup is missing');
        await tx.ticket.update({ where: { id }, data: { statusId: open.id, updatedAt: now } });
        await this.createTasksFromTemplates(tx, ticket.serviceRequest!.id, user.id, approval.serviceRequest.catalogItem.taskTemplates);
      }
      return tx.ticket.findUniqueOrThrow({ where: { id }, include: serviceRequestInclude });
    });
  }

  async updateTask(user: AuthUser, id: string, taskId: string, dto: UpdateRequestTaskDto) {
    requireServiceDeskRole(user);
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId: user.organizationId, ticketType: { name: 'SERVICE_REQUEST' } }, include: { serviceRequest: true } });
    if (!ticket?.serviceRequest) throw new NotFoundException('Service request not found');
    const task = await this.prisma.requestTask.findFirst({ where: { id: taskId, serviceRequestId: ticket.serviceRequest.id } });
    if (!task) throw new NotFoundException('Request task not found');
    if (dto.assignmentGroupId) await this.ensureGroup(user, dto.assignmentGroupId);
    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findFirst({ where: { id: dto.assignedToId, organizationId: user.organizationId, active: true } });
      if (!assignee) throw new BadRequestException('Assignee must be an active user in this organization');
    }
    await this.prisma.requestTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        assignmentGroupId: dto.assignmentGroupId,
        assignedToId: dto.assignedToId,
        status: dto.status,
        completedAt: dto.status === 'COMPLETED' ? new Date() : dto.status ? null : undefined,
        updatedAt: new Date(),
      },
    });
    const note = dto.workNote?.trim();
    await this.prisma.ticketActivity.create({ data: { ticketId: id, createdById: user.id, comment: note ? `${task.taskNumber}: ${note}` : `Task ${task.taskNumber} updated${dto.status ? ` to ${dto.status}` : ''}` } });
    return this.prisma.ticket.findUniqueOrThrow({ where: { id }, include: serviceRequestInclude });
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

  private async createTasksFromTemplates(tx: Prisma.TransactionClient, serviceRequestId: string, createdById: string, templates: Prisma.JsonValue) {
    if (!Array.isArray(templates) || templates.length === 0) return;
    for (const template of templates) {
      if (!template || typeof template !== 'object' || Array.isArray(template)) continue;
      const value = template as Record<string, unknown>;
      const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : 'Fulfillment task';
      const description = typeof value.description === 'string' ? value.description : undefined;
      const assignmentGroupId = typeof value.assignmentGroupId === 'string' ? value.assignmentGroupId : undefined;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('request_task_number:TASK'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(task_number FROM 5) AS INTEGER)), 0) + 1)::integer AS next
        FROM request_tasks
        WHERE task_number ~ '^TASK[0-9]{6}$'
      `;
      await tx.requestTask.create({
        data: {
          serviceRequestId,
          taskNumber: `TASK${sequence.next.toString().padStart(6, '0')}`,
          title,
          description,
          assignmentGroupId,
          createdById,
        },
      });
    }
  }
}
