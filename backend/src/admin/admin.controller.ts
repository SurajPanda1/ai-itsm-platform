import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { CreateGroupDto, CreateSlaDefinitionDto, CreateUserDto, GroupMemberDto, GroupRoleDto, UpdateGroupDto, UpdateUserDto } from './admin.dto';
import { Roles } from '../auth/roles';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

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

  @Get('users')
  async users(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number, @Query('search') search = '') {
    const take = Math.min(Math.max(limit, 1), 100);
    const currentPage = Math.max(page, 1);
    const where = { organizationId: user.organizationId, ...(search.trim() ? { OR: [{ name: { contains: search.trim(), mode: 'insensitive' as const } }, { email: { contains: search.trim(), mode: 'insensitive' as const } }] } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (currentPage - 1) * take, take, select: { id: true, name: true, email: true, active: true, departmentId: true, directRoles: { select: { role: { select: { id: true, name: true } } } }, assignmentGroupMemberships: { select: { assignmentGroup: { select: { id: true, name: true, roles: { select: { role: { select: { id: true, name: true } } } } } } } } }, orderBy: { name: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, page: currentPage, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  @Post('users')
  async createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    const employeeRole = await this.prisma.role.findUniqueOrThrow({ where: { name: Roles.Employee } });
    return this.prisma.user.create({ data: { organizationId: user.organizationId, name: dto.name, email: dto.email.toLowerCase(), roleId: employeeRole.id, departmentId: dto.departmentId, passwordHash: await hash(dto.temporaryPassword, 12) }, select: { id: true, name: true, email: true, active: true } });
  }

  @Patch('users/:id')
  updateUser(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.prisma.user.updateMany({ where: { id, organizationId: user.organizationId }, data: { ...dto, updatedAt: new Date() } });
  }

  @Get('groups')
  groups(@CurrentUser() user: AuthUser) {
    return this.prisma.assignmentGroup.findMany({ where: { organizationId: user.organizationId }, include: { manager: { select: { id: true, name: true } }, roles: { select: { role: { select: { id: true, name: true } } } }, members: { select: { user: { select: { id: true, name: true, email: true, active: true } } } } }, orderBy: { name: 'asc' } });
  }

  @Post('groups')
  createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.prisma.assignmentGroup.create({ data: { organizationId: user.organizationId, ...dto } });
  }

  @Patch('groups/:id')
  updateGroup(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
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

  @Post('slas')
  async createSla(@CurrentUser() user: AuthUser, @Body() dto: CreateSlaDefinitionDto) {
    const latest = await this.prisma.slaDefinition.aggregate({ where: { organizationId: user.organizationId, name: dto.name }, _max: { version: true } });
    return this.prisma.slaDefinition.create({ data: { organizationId: user.organizationId, ...dto, pauseStatuses: dto.pauseStatuses ?? [], version: (latest._max.version ?? 0) + 1 } });
  }

  @Patch('slas/:id/deactivate')
  deactivateSla(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.slaDefinition.updateMany({ where: { id, organizationId: user.organizationId }, data: { active: false, updatedAt: new Date() } });
  }
}
