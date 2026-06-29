import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { hash } from 'bcryptjs';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { CreateBusinessCalendarDto, CreateChangeApprovalRuleDto, CreateCiCategoryDto, CreateCiRelationshipTypeDto, CreateCiTypeDto, CreateDepartmentDto, CreateGroupDto, CreateSlaDefinitionDto, CreateUserDto, GroupMemberDto, GroupRoleDto, TestStorageConnectionDto, UpdateChangeApprovalRuleDto, UpdateCiCategoryDto, UpdateCiRelationshipTypeDto, UpdateCiTypeDto, UpdateDepartmentDto, UpdateGroupDto, UpdateOrganizationSettingsDto, UpdateUserDto } from './admin.dto';
import { Roles } from '../auth/roles';
import { Prisma } from '@prisma/client';
import { AttachmentConnectionService } from '../attachments/attachment-connection.service';
import { AttachmentStorageService } from '../attachments/attachment-storage.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly attachmentConnection: AttachmentConnectionService, private readonly attachmentStorage: AttachmentStorageService) {}

  @Get('organization-settings')
  async organizationSettings(@CurrentUser() user: AuthUser) {
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { name: true, brandingSettings: true, attachmentSettings: true } });
    const branding = organization.brandingSettings as Record<string, unknown>;
    const { logoKey: _logoKey, faviconKey: _faviconKey, logoContentType: _logoContentType, faviconContentType: _faviconContentType, ...editableBranding } = branding;
    return { organizationName: organization.name, branding: { ...editableBranding, ...(branding.logoKey ? { logoUrl: `/api/branding/assets/${user.organizationId}/logo` } : { logoUrl: '' }), ...(branding.faviconKey ? { faviconUrl: `/api/branding/assets/${user.organizationId}/favicon` } : { faviconUrl: '' }) }, attachments: organization.attachmentSettings };
  }

  @Patch('organization-settings')
  async updateOrganizationSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrganizationSettingsDto) {
    const current = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { brandingSettings: true, attachmentSettings: true } });
    const branding = current.brandingSettings as Record<string, unknown>;
    const attachments = current.attachmentSettings as Record<string, unknown>;
    const { organizationName, attachmentsEnabled, storageProvider, storageBucket, storageRegion, storageEndpoint, maxFileSizeMb, ...brandingInput } = dto;
    const nextAttachments = { ...attachments, enabled: attachmentsEnabled ?? attachments.enabled ?? false, provider: storageProvider ?? attachments.provider ?? 'NONE', bucket: storageBucket ?? attachments.bucket ?? '', region: storageRegion ?? attachments.region ?? '', endpoint: storageEndpoint ?? attachments.endpoint ?? '', maxFileSizeMb: maxFileSizeMb ?? attachments.maxFileSizeMb ?? 10 };
    if (nextAttachments.enabled && nextAttachments.provider === 'NONE') nextAttachments.enabled = false;
    return this.prisma.organization.update({ where: { id: user.organizationId }, data: { name: organizationName, brandingSettings: { ...branding, ...brandingInput }, attachmentSettings: nextAttachments }, select: { name: true, brandingSettings: true, attachmentSettings: true } });
  }

  @Post('organization-settings/test-storage')
  testStorage(@Body() dto: TestStorageConnectionDto) {
    return this.attachmentConnection.test(dto);
  }

  @Post('organization-settings/branding/:kind')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async uploadBrandAsset(@CurrentUser() user: AuthUser, @Param('kind') kind: string, @UploadedFile() file?: { originalname:string; mimetype:string; size:number; buffer:Buffer }) {
    if (kind !== 'logo' && kind !== 'favicon') throw new BadRequestException('Branding asset must be logo or favicon');
    const asset = await this.attachmentStorage.putBrandAsset(user.organizationId, kind, file);
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { brandingSettings: true } });
    const branding = organization.brandingSettings as Record<string, unknown>;
    const nextBranding = { ...branding, [`${kind}Key`]: asset.key, [`${kind}ContentType`]: asset.contentType, [`${kind}Url`]: '' } as Prisma.InputJsonValue;
    await this.prisma.organization.update({ where: { id: user.organizationId }, data: { brandingSettings: nextBranding } });
    return { url: `/api/branding/assets/${user.organizationId}/${kind}` };
  }

  @Delete('organization-settings/branding/:kind')
  async removeBrandAsset(@CurrentUser() user: AuthUser, @Param('kind') kind: string) {
    if (kind !== 'logo' && kind !== 'favicon') throw new BadRequestException('Branding asset must be logo or favicon');
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { brandingSettings: true } });
    const branding = organization.brandingSettings as Record<string, unknown>; const key=branding[`${kind}Key`];
    if(typeof key==='string') await this.attachmentStorage.removeBrandAsset(user.organizationId,key);
    const next={...branding};delete next[`${kind}Key`];delete next[`${kind}ContentType`];delete next[`${kind}Url`];
    await this.prisma.organization.update({where:{id:user.organizationId},data:{brandingSettings:next as Prisma.InputJsonValue}});
    return {removed:true};
  }

  @Get('reference-data')
  async referenceData(@CurrentUser() user: AuthUser) {
    const [roles, departments, priorities, ticketTypes, calendars] = await Promise.all([
      this.prisma.role.findMany({ select: { id: true, name: true, description: true }, orderBy: { name: 'asc' } }),
      this.prisma.$queryRaw`SELECT id, name, description FROM departments WHERE organization_id=${user.organizationId}::uuid ORDER BY name`,
      this.prisma.priority.findMany({ select: { id: true, name: true }, orderBy: { level: 'asc' } }),
      this.prisma.ticketType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.businessCalendar.findMany({ where: { organizationId: user.organizationId, active: true }, select: { id: true, name: true, timezone: true, calendarType: true } }),
    ]);
    return { roles, departments, priorities, ticketTypes, calendars };
  }

  @Get('cmdb-settings')
  async cmdbSettings(@CurrentUser() user: AuthUser) {
    const [categories, types, relationshipTypes] = await Promise.all([
      this.prisma.ciCategory.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
      this.prisma.ciType.findMany({ where: { organizationId: user.organizationId }, include: { category: { select: { id: true, name: true, active: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
      this.prisma.ciRelationshipType.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    ]);
    return { categories, types, relationshipTypes };
  }

  @Post('cmdb-settings/categories')
  async createCiCategory(@CurrentUser() user: AuthUser, @Body() dto: CreateCiCategoryDto) {
    try {
      return await this.prisma.ciCategory.create({ data: { organizationId: user.organizationId, name: dto.name, description: dto.description, active: dto.active ?? true } });
    } catch (error) {
      this.handleDuplicateLookup(error, 'CI category already exists');
    }
  }

  @Patch('cmdb-settings/categories/:id')
  async updateCiCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCiCategoryDto) {
    try {
      const updated = await this.prisma.ciCategory.updateMany({ where: { id, organizationId: user.organizationId }, data: { ...dto } });
      return { updated: updated.count > 0 };
    } catch (error) {
      this.handleDuplicateLookup(error, 'CI category already exists');
    }
  }

  @Post('cmdb-settings/types')
  async createCiType(@CurrentUser() user: AuthUser, @Body() dto: CreateCiTypeDto) {
    await this.ensureCiCategory(user.organizationId, dto.categoryId);
    try {
      return await this.prisma.ciType.create({ data: { organizationId: user.organizationId, categoryId: dto.categoryId, name: dto.name, description: dto.description, active: dto.active ?? true } });
    } catch (error) {
      this.handleDuplicateLookup(error, 'CI type already exists');
    }
  }

  @Patch('cmdb-settings/types/:id')
  async updateCiType(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCiTypeDto) {
    if (dto.categoryId) await this.ensureCiCategory(user.organizationId, dto.categoryId);
    try {
      const updated = await this.prisma.ciType.updateMany({ where: { id, organizationId: user.organizationId }, data: { categoryId: dto.categoryId, name: dto.name, description: dto.description, active: dto.active, updatedAt: new Date() } });
      return { updated: updated.count > 0 };
    } catch (error) {
      this.handleDuplicateLookup(error, 'CI type already exists');
    }
  }

  @Post('cmdb-settings/relationship-types')
  async createCiRelationshipType(@Body() dto: CreateCiRelationshipTypeDto) {
    try {
      return await this.prisma.ciRelationshipType.create({ data: { name: dto.name, description: dto.description, active: dto.active ?? true } });
    } catch (error) {
      this.handleDuplicateLookup(error, 'Relationship type already exists');
    }
  }

  @Patch('cmdb-settings/relationship-types/:id')
  async updateCiRelationshipType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCiRelationshipTypeDto) {
    try {
      return await this.prisma.ciRelationshipType.update({ where: { id }, data: { name: dto.name, description: dto.description, active: dto.active, updatedAt: new Date() } });
    } catch (error) {
      this.handleDuplicateLookup(error, 'Relationship type already exists');
    }
  }

  @Post('departments')
  createDepartment(@CurrentUser() user: AuthUser, @Body() dto: CreateDepartmentDto) {
    return this.prisma.$executeRaw`
      INSERT INTO departments (organization_id, name, description)
      VALUES (${user.organizationId}::uuid, ${dto.name}, ${dto.description ?? null})
      ON CONFLICT DO NOTHING
    `;
  }

  @Patch('departments/:id')
  updateDepartment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.prisma.$queryRaw`
      UPDATE departments
      SET name = COALESCE(${dto.name ?? null}, name),
          description = COALESCE(${dto.description ?? null}, description),
          updated_at = now()
      WHERE id = ${id}::uuid AND organization_id = ${user.organizationId}::uuid
      RETURNING id, name, description
    `;
  }

  @Get('users')
  async users(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number, @Query('search') search = '') {
    const take = Math.min(Math.max(limit, 1), 100);
    const currentPage = Math.max(page, 1);
    const where = { organizationId: user.organizationId, ...(search.trim() ? { OR: [{ name: { contains: search.trim(), mode: 'insensitive' as const } }, { email: { contains: search.trim(), mode: 'insensitive' as const } }] } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (currentPage - 1) * take, take, select: { id: true, name: true, email: true, phone: true, active: true, departmentId: true, managerId: true, managerRequiredExempt: true, manager: { select: { id: true, name: true, email: true } }, directRoles: { select: { role: { select: { id: true, name: true } } } }, assignmentGroupMemberships: { select: { assignmentGroup: { select: { id: true, name: true, roles: { select: { role: { select: { id: true, name: true } } } } } } } } }, orderBy: { name: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, page: currentPage, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  @Post('users')
  async createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    if (!dto.managerRequiredExempt && !dto.managerId) throw new BadRequestException('Manager is required unless the user is marked exempt');
    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, organizationId: user.organizationId, active: true } });
      if (!manager) throw new BadRequestException('Manager must be an active user in this organization');
    }
    const employeeRole = await this.prisma.role.findUniqueOrThrow({ where: { name: Roles.Employee } });
    return this.prisma.user.create({ data: { organizationId: user.organizationId, name: dto.name, email: dto.email.toLowerCase(), phone: dto.phone, roleId: employeeRole.id, departmentId: dto.departmentId, managerId: dto.managerId, managerRequiredExempt: dto.managerRequiredExempt ?? false, passwordHash: await hash(dto.temporaryPassword, 12) }, select: { id: true, name: true, email: true, active: true } });
  }

  @Patch('users/:id')
  async updateUser(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    if (dto.managerId === id) throw new BadRequestException('A user cannot be their own manager');
    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, organizationId: user.organizationId, active: true } });
      if (!manager) throw new BadRequestException('Manager must be an active user in this organization');
    }
    if (dto.active === false) {
      const [directReports, managedGroups] = await Promise.all([
        this.prisma.user.count({ where: { organizationId: user.organizationId, managerId: id, active: true } }),
        this.prisma.assignmentGroup.count({ where: { organizationId: user.organizationId, managerId: id, active: true } }),
      ]);
      if (directReports > 0 || managedGroups > 0) throw new BadRequestException('User is still a manager. Reassign their users/groups before deactivating.');
    }
    return this.prisma.user.updateMany({ where: { id, organizationId: user.organizationId }, data: { ...dto, updatedAt: new Date() } });
  }

  @Get('groups')
  async groups(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number, @Query('search') search = '', @Query('active') active = 'all') {
    const take = Math.min(Math.max(limit, 1), 100);
    const currentPage = Math.max(page, 1);
    const where = {
      organizationId: user.organizationId,
      ...(search.trim() ? { name: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
      ...(active === 'true' ? { active: true } : active === 'false' ? { active: false } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.assignmentGroup.findMany({ where, skip: (currentPage - 1) * take, take, include: { manager: { select: { id: true, name: true, email: true } }, roles: { select: { role: { select: { id: true, name: true } } } }, members: { select: { user: { select: { id: true, name: true, email: true, active: true } } } } }, orderBy: { name: 'asc' } }),
      this.prisma.assignmentGroup.count({ where }),
    ]);
    return { data, page: currentPage, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  @Post('groups')
  async createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, organizationId: user.organizationId, active: true } });
    if (!manager) throw new BadRequestException('Group manager must be an active user in this organization');
    return this.prisma.assignmentGroup.create({ data: { organizationId: user.organizationId, ...dto } });
  }

  @Patch('groups/:id')
  async updateGroup(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, organizationId: user.organizationId, active: true } });
      if (!manager) throw new BadRequestException('Group manager must be an active user in this organization');
    }
    return this.prisma.assignmentGroup.updateMany({ where: { id, organizationId: user.organizationId }, data: { ...dto, updatedAt: new Date() } });
  }

  @Post('groups/:id/members')
  async addMember(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GroupMemberDto) {
    const [group, member] = await Promise.all([this.prisma.assignmentGroup.findFirst({ where: { id, organizationId: user.organizationId } }), this.prisma.user.findFirst({ where: { id: dto.userId, organizationId: user.organizationId, active: true } })]);
    if (!group || !member) return { added: false };
    await this.prisma.assignmentGroupMember.upsert({ where: { assignmentGroupId_userId: { assignmentGroupId: id, userId: dto.userId } }, create: { assignmentGroupId: id, userId: dto.userId }, update: {} });
    return { added: true };
  }

  @Delete('groups/:id/members/:userId')
  async removeMember(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!group) return { removed: false };
    await this.prisma.assignmentGroupMember.deleteMany({ where: { assignmentGroupId: id, userId } });
    return { removed: true };
  }

  @Post('groups/:id/roles')
  async addRole(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GroupRoleDto) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!group) return { added: false };
    await this.prisma.assignmentGroupRole.upsert({ where: { assignmentGroupId_roleId: { assignmentGroupId: id, roleId: dto.roleId } }, create: { assignmentGroupId: id, roleId: dto.roleId }, update: {} });
    return { added: true };
  }

  @Delete('groups/:id/roles/:roleId')
  async removeRole(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('roleId', ParseUUIDPipe) roleId: string) {
    const group = await this.prisma.assignmentGroup.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!group) return { removed: false };
    await this.prisma.assignmentGroupRole.deleteMany({ where: { assignmentGroupId: id, roleId } });
    return { removed: true };
  }

  @Get('slas')
  slas(@CurrentUser() user: AuthUser) {
    return this.prisma.slaDefinition.findMany({ where: { organizationId: user.organizationId }, include: { priority: { select: { id: true, name: true } }, ticketType: { select: { id: true, name: true } }, calendar: { select: { id: true, name: true, timezone: true, calendarType: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }, { version: 'desc' }] });
  }

  @Post('calendars')
  createCalendar(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessCalendarDto) {
    return this.prisma.businessCalendar.create({ data: { organizationId: user.organizationId, name: dto.name, timezone: dto.timezone, calendarType: dto.calendarType, weeklySchedule: dto.weeklySchedule ?? undefined, holidays: dto.holidays ?? [] } });
  }

  @Post('slas')
  async createSla(@CurrentUser() user: AuthUser, @Body() dto: CreateSlaDefinitionDto) {
    const latest = await this.prisma.slaDefinition.aggregate({ where: { organizationId: user.organizationId, name: dto.name }, _max: { version: true } });
    return this.prisma.slaDefinition.create({ data: { organizationId: user.organizationId, ...dto, pauseStatuses: dto.pauseStatuses ?? [], version: (latest._max.version ?? 0) + 1 } });
  }

  @Patch('slas/:id/deactivate')
  deactivateSla(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.slaDefinition.updateMany({ where: { id, organizationId: user.organizationId }, data: { active: false, updatedAt: new Date() } });
  }

  @Get('change-approval-rules')
  changeApprovalRules(@CurrentUser() user: AuthUser) {
    return this.prisma.changeApprovalRule.findMany({
      where: { organizationId: user.organizationId },
      include: {
        approvalGroup: { select: { id: true, name: true } },
        specificApprover: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ active: 'desc' }, { sequence: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Post('change-approval-rules')
  async createChangeApprovalRule(@CurrentUser() user: AuthUser, @Body() dto: CreateChangeApprovalRuleDto) {
    await this.validateChangeApprovalRule(user.organizationId, dto.approvalType, dto.approvalGroupId, dto.specificApproverId);
    return this.prisma.changeApprovalRule.create({
      data: {
        organizationId: user.organizationId,
        sequence: dto.sequence,
        approvalType: dto.approvalType,
        approvalGroupId: this.isGroupBackedChangeApproval(dto.approvalType) ? dto.approvalGroupId : null,
        specificApproverId: dto.approvalType === 'SPECIFIC_USER' ? dto.specificApproverId : null,
        active: dto.active ?? true,
      },
      include: { approvalGroup: { select: { id: true, name: true } }, specificApprover: { select: { id: true, name: true, email: true } } },
    });
  }

  @Patch('change-approval-rules/:id')
  async updateChangeApprovalRule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChangeApprovalRuleDto) {
    const current = await this.prisma.changeApprovalRule.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!current) throw new BadRequestException('Change approval rule not found');
    const approvalType = dto.approvalType ?? current.approvalType;
    await this.validateChangeApprovalRule(user.organizationId, approvalType, dto.approvalGroupId ?? current.approvalGroupId ?? undefined, dto.specificApproverId ?? current.specificApproverId ?? undefined);
    return this.prisma.changeApprovalRule.update({
      where: { id },
      data: {
        sequence: dto.sequence,
        approvalType: dto.approvalType,
        approvalGroupId: this.isGroupBackedChangeApproval(approvalType) ? (dto.approvalGroupId ?? current.approvalGroupId) : null,
        specificApproverId: approvalType === 'SPECIFIC_USER' ? (dto.specificApproverId ?? current.specificApproverId) : null,
        active: dto.active,
        updatedAt: new Date(),
      },
      include: { approvalGroup: { select: { id: true, name: true } }, specificApprover: { select: { id: true, name: true, email: true } } },
    });
  }

  @Patch('change-approval-rules/:id/deactivate')
  deactivateChangeApprovalRule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.changeApprovalRule.updateMany({ where: { id, organizationId: user.organizationId }, data: { active: false, updatedAt: new Date() } });
  }

  private async validateChangeApprovalRule(organizationId: string, approvalType: string, approvalGroupId?: string, specificApproverId?: string) {
    if (this.isGroupBackedChangeApproval(approvalType)) {
      if (!approvalGroupId) throw new BadRequestException('Approval group is required for group approval');
      const group = await this.prisma.assignmentGroup.findFirst({ where: { id: approvalGroupId, organizationId, active: true } });
      if (!group) throw new BadRequestException('Approval group must be active and belong to this organization');
    }
    if (approvalType === 'SPECIFIC_USER') {
      if (!specificApproverId) throw new BadRequestException('Specific approver is required');
      const approver = await this.prisma.user.findFirst({ where: { id: specificApproverId, organizationId, active: true } });
      if (!approver) throw new BadRequestException('Specific approver must be active and belong to this organization');
    }
  }

  private isGroupBackedChangeApproval(approvalType: string) {
    return ['GROUP', 'CAB', 'SECURITY', 'ITAM'].includes(approvalType);
  }

  private async ensureCiCategory(organizationId: string, categoryId: string) {
    const exists = await this.prisma.ciCategory.count({ where: { id: categoryId, organizationId, active: true } });
    if (!exists) throw new BadRequestException('CI category must be active and belong to this organization');
  }

  private handleDuplicateLookup(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException(message);
    throw error;
  }
}
