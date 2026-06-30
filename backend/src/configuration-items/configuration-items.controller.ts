import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, ForbiddenException, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmCmdbImportDto, CreateCiRelationshipDto, CreateConfigurationItemDto, PreviewCmdbImportDto, UpdateCiRelationshipDto, UpdateConfigurationItemDto } from './configuration-items.dto';

const ciInclude = {
  ciCategory: { select: { id: true, name: true } },
  ciType: { select: { id: true, name: true, categoryId: true } },
  status: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true } },
  _count: { select: { parentRelationships: true, childRelationships: true } },
} satisfies Prisma.ConfigurationItemInclude;

const cmdbRelationshipTypeNames = [
  'Runs On',
  'Hosted On',
  'Depends On',
  'Connected To',
  'Contains',
  'Uses',
  'Backup Of',
  'Replicated To',
  'Managed By',
  'Owned By',
];

@Controller('configuration-items')
@UseGuards(JwtAuthGuard)
export class ConfigurationItemsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('lookups')
  async lookups(@CurrentUser() user: AuthUser, @Query('categoryId') categoryId = '') {
    this.requireCmdbView(user);
    const [categories, types, statuses, relationshipTypes] = await Promise.all([
      this.prisma.ciCategory.findMany({ where: { organizationId: user.organizationId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.ciType.findMany({ where: { organizationId: user.organizationId, active: true, ...(categoryId ? { categoryId } : {}) }, include: { category: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.status.findMany({ where: { module: 'CMDB' }, orderBy: { name: 'asc' } }),
      this.prisma.ciRelationshipType.findMany({ where: { name: { in: cmdbRelationshipTypeNames }, active: true }, orderBy: { name: 'asc' } }),
    ]);
    return { categories, types, statuses, relationshipTypes };
  }

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    this.requireCmdbView(user);
    const term = q.trim();
    return this.prisma.configurationItem.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        ...(term
          ? { OR: [{ name: { contains: term, mode: 'insensitive' as const } }, { ciNumber: { contains: term, mode: 'insensitive' as const } }, { ciType: { name: { contains: term, mode: 'insensitive' as const } } }] }
          : {}),
      },
      select: { id: true, name: true, ciNumber: true, ciType: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: 20,
    }).then((items) => items.map((item) => ({ id: item.id, name: item.name, ciNumber: item.ciNumber, ciType: item.ciType?.name })));
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('search') search = '',
    @Query('categoryId') categoryId = '',
    @Query('typeId') typeId = '',
    @Query('statusId') statusId = '',
    @Query('active') active = 'true',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    this.requireCmdbView(user);
    const take = Math.min(Math.max(limit, 1), 100);
    const currentPage = Math.max(page, 1);
    const term = search.trim();
    const where: Prisma.ConfigurationItemWhereInput = {
      organizationId: user.organizationId,
      ...(active === 'all' ? {} : { active: active !== 'false' }),
      ...(categoryId ? { ciCategoryId: categoryId } : {}),
      ...(typeId ? { ciTypeId: typeId } : {}),
      ...(statusId ? { statusId } : {}),
      ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { ciNumber: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.configurationItem.findMany({ where, include: ciInclude, skip: (currentPage - 1) * take, take, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
      this.prisma.configurationItem.count({ where }),
    ]);
    return { data: data.map((item) => this.toCiDto(item)), page: currentPage, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  @Get('items/:id')
  async detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireCmdbView(user);
    const item = await this.prisma.configurationItem.findFirst({ where: { id, organizationId: user.organizationId }, include: ciInclude });
    if (!item) throw new BadRequestException('Configuration item not found');
    const [parents, children, tickets] = await Promise.all([
      this.prisma.ciRelationship.findMany({ where: { organizationId: user.organizationId, childCiId: id }, include: { parentCi: { select: { id: true, name: true, ciNumber: true } }, relationshipType: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.ciRelationship.findMany({ where: { organizationId: user.organizationId, parentCiId: id }, include: { childCi: { select: { id: true, name: true, ciNumber: true } }, relationshipType: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.ticketConfigurationItem.findMany({ where: { ciId: id, ticket: { organizationId: user.organizationId } }, include: { ticket: { include: { ticketType: true, status: true, assignmentGroup: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return {
      ...this.toCiDto(item),
      parents: parents.map((r) => ({ id: r.id, relationshipType: r.relationshipType.name, status: r.status, ci: r.parentCi })),
      children: children.map((r) => ({ id: r.id, relationshipType: r.relationshipType.name, status: r.status, ci: r.childCi })),
      relatedIncidents: this.relatedTickets(tickets, 'INCIDENT'),
      relatedProblems: this.relatedTickets(tickets, 'PROBLEM'),
      relatedChanges: this.relatedTickets(tickets, 'CHANGE'),
      openRelationshipCount: parents.filter((r) => r.status === 'ACTIVE').length + children.filter((r) => r.status === 'ACTIVE').length,
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateConfigurationItemDto) {
    this.requireCmdbManage(user);
    await this.validateCiReferences(user.organizationId, dto);
    try {
      const item = await this.prisma.configurationItem.create({
        data: {
          organizationId: user.organizationId,
          ciNumber: await this.nextCiNumber(user.organizationId),
          name: dto.name,
          description: dto.description,
          ownerId: dto.ownerId,
          ciCategoryId: dto.categoryId,
          ciTypeId: dto.typeId,
          statusId: dto.statusId,
          environment: dto.environment,
          criticality: dto.criticality ?? 'MEDIUM',
        },
        include: ciInclude,
      });
      return this.toCiDto(item);
    } catch (error) {
      this.handleDuplicateCi(error);
    }
  }

  @Patch('items/:id')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConfigurationItemDto) {
    this.requireCmdbManage(user);
    const existing = await this.prisma.configurationItem.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!existing) throw new BadRequestException('Configuration item not found');
    await this.validateCiReferences(user.organizationId, dto);
    try {
      const item = await this.prisma.configurationItem.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          ownerId: dto.ownerId,
          ciCategoryId: dto.categoryId,
          ciTypeId: dto.typeId,
          statusId: dto.statusId,
          environment: dto.environment,
          criticality: dto.criticality,
          active: dto.active,
          updatedAt: new Date(),
        },
        include: ciInclude,
      });
      return this.toCiDto(item);
    } catch (error) {
      this.handleDuplicateCi(error);
    }
  }

  @Patch('items/:id/deactivate')
  async deactivate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireCmdbManage(user);
    const item = await this.prisma.configurationItem.updateMany({ where: { id, organizationId: user.organizationId }, data: { active: false, updatedAt: new Date() } });
    return { deactivated: item.count > 0 };
  }

  @Get('relationships/list')
  async relationships(@CurrentUser() user: AuthUser, @Query('search') search = '', @Query('relationshipTypeId') relationshipTypeId = '', @Query('status') status = '', @Query('side') side = 'all') {
    this.requireCmdbView(user);
    const term = search.trim();
    const ciSearch = term ? { OR: [{ name: { contains: term, mode: 'insensitive' as const } }, { ciNumber: { contains: term, mode: 'insensitive' as const } }] } : {};
    const rows = await this.prisma.ciRelationship.findMany({
      where: {
        organizationId: user.organizationId,
        ...(relationshipTypeId ? { relationshipTypeId } : {}),
        ...(status ? { status } : {}),
        ...(term ? side === 'parent' ? { parentCi: ciSearch } : side === 'child' ? { childCi: ciSearch } : { OR: [{ parentCi: ciSearch }, { childCi: ciSearch }] } : {}),
      },
      include: { parentCi: { select: { id: true, name: true, ciNumber: true } }, childCi: { select: { id: true, name: true, ciNumber: true } }, relationshipType: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => this.toRelationshipDto(row));
  }

  @Post('relationships')
  async createRelationship(@CurrentUser() user: AuthUser, @Body() dto: CreateCiRelationshipDto) {
    this.requireCmdbManage(user);
    await this.validateRelationship(user.organizationId, dto.parentCiId, dto.childCiId, dto.relationshipTypeId);
    try {
      const row = await this.prisma.ciRelationship.create({ data: { organizationId: user.organizationId, parentCiId: dto.parentCiId, childCiId: dto.childCiId, relationshipTypeId: dto.relationshipTypeId, status: dto.status, description: dto.description, createdById: user.id }, include: { parentCi: true, childCi: true, relationshipType: true, createdBy: { select: { id: true, name: true } } } });
      return this.toRelationshipDto(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Duplicate relationship already exists');
      throw error;
    }
  }

  @Patch('relationships/:id')
  async updateRelationship(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCiRelationshipDto) {
    this.requireCmdbManage(user);
    const current = await this.prisma.ciRelationship.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!current) throw new BadRequestException('Relationship not found');
    const parentCiId = dto.parentCiId ?? current.parentCiId;
    const childCiId = dto.childCiId ?? current.childCiId;
    const relationshipTypeId = dto.relationshipTypeId ?? current.relationshipTypeId;
    await this.validateRelationship(user.organizationId, parentCiId, childCiId, relationshipTypeId);
    try {
      const row = await this.prisma.ciRelationship.update({ where: { id }, data: { parentCiId: dto.parentCiId, childCiId: dto.childCiId, relationshipTypeId: dto.relationshipTypeId, status: dto.status, description: dto.description, updatedAt: new Date() }, include: { parentCi: true, childCi: true, relationshipType: true, createdBy: { select: { id: true, name: true } } } });
      return this.toRelationshipDto(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Duplicate relationship already exists');
      throw error;
    }
  }

  @Delete('relationships/:id')
  async deleteRelationship(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireCmdbManage(user);
    await this.prisma.ciRelationship.deleteMany({ where: { id, organizationId: user.organizationId } });
    return { deleted: true };
  }

  @Post('import/preview')
  async previewImport(@CurrentUser() user: AuthUser, @Body() dto: PreviewCmdbImportDto) {
    this.requireAdmin(user);
    return this.validateImportRows(user.organizationId, dto.rows);
  }

  @Post('import/confirm')
  async confirmImport(@CurrentUser() user: AuthUser, @Body() dto: ConfirmCmdbImportDto) {
    this.requireAdmin(user);
    const preview = await this.validateImportRows(user.organizationId, dto.rows);
    let createdRecords = 0;
    let skippedRecords = 0;
    for (const row of preview.rows.filter((value) => value.valid)) {
      try {
        await this.prisma.configurationItem.create({
          data: {
            organizationId: user.organizationId,
            ciNumber: row.normalized.ciNumber || await this.nextCiNumber(user.organizationId),
            name: row.normalized.name,
            ciCategoryId: row.normalized.categoryId,
            ciTypeId: row.normalized.typeId,
            statusId: row.normalized.statusId,
            environment: row.normalized.environment,
            criticality: row.normalized.criticality,
            ownerId: row.normalized.ownerId,
            description: row.normalized.description,
          },
        });
        createdRecords += 1;
      } catch {
        skippedRecords += 1;
      }
    }
    return { totalRows: preview.totalRows, validRows: preview.validRows, failedRows: preview.failedRows, createdRecords, skippedRecords, errors: preview.errors };
  }

  private requireCmdbView(user: AuthUser) {
    if (!user.roles.some((role) => ([Roles.Agent, Roles.ServiceManager, Roles.Admin] as string[]).includes(role))) throw new ForbiddenException('CMDB access requires a service desk role');
  }

  private requireCmdbManage(user: AuthUser) {
    if (!user.roles.some((role) => ([Roles.ServiceManager, Roles.Admin] as string[]).includes(role))) throw new ForbiddenException('CMDB management requires IT Service Manager or Admin role');
  }

  private requireAdmin(user: AuthUser) {
    if (!user.roles.includes(Roles.Admin)) throw new ForbiddenException('CMDB import requires Admin role');
  }

  private async validateCiReferences(organizationId: string, dto: Partial<CreateConfigurationItemDto & UpdateConfigurationItemDto>) {
    const checks = [
      dto.categoryId ? this.prisma.ciCategory.count({ where: { id: dto.categoryId, organizationId, active: true } }) : Promise.resolve(1),
      dto.typeId ? this.prisma.ciType.count({ where: { id: dto.typeId, organizationId, active: true, ...(dto.categoryId ? { categoryId: dto.categoryId } : {}) } }) : Promise.resolve(1),
      dto.statusId ? this.prisma.status.count({ where: { id: dto.statusId, module: 'CMDB' } }) : Promise.resolve(1),
      dto.ownerId ? this.prisma.user.count({ where: { id: dto.ownerId, organizationId, active: true } }) : Promise.resolve(1),
    ];
    const [category, type, status, owner] = await Promise.all(checks);
    if (!category) throw new BadRequestException('Unknown CI category');
    if (!type) throw new BadRequestException('Unknown CI type');
    if (!status) throw new BadRequestException('Unknown CI status');
    if (!owner) throw new BadRequestException('Owner must be an active user in this organization');
  }

  private async validateRelationship(organizationId: string, parentCiId: string, childCiId: string, relationshipTypeId: string) {
    if (parentCiId === childCiId) throw new BadRequestException('Parent CI cannot equal Child CI');
    const [parent, child, type] = await Promise.all([
      this.prisma.configurationItem.count({ where: { id: parentCiId, organizationId } }),
      this.prisma.configurationItem.count({ where: { id: childCiId, organizationId } }),
      this.prisma.ciRelationshipType.count({ where: { id: relationshipTypeId, name: { in: cmdbRelationshipTypeNames }, active: true } }),
    ]);
    if (!parent || !child) throw new BadRequestException('Both CIs must belong to this organization');
    if (!type) throw new BadRequestException('Unknown relationship type');
  }

  private async validateImportRows(organizationId: string, rows: Record<string, string>[]) {
    const [categories, types, statuses, users, existingItems] = await Promise.all([
      this.prisma.ciCategory.findMany({ where: { organizationId, active: true } }),
      this.prisma.ciType.findMany({ where: { organizationId, active: true }, include: { category: true } }),
      this.prisma.status.findMany({ where: { module: 'CMDB' } }),
      this.prisma.user.findMany({ where: { organizationId, active: true }, select: { id: true, email: true } }),
      this.prisma.configurationItem.findMany({ where: { organizationId }, select: { name: true, ciNumber: true } }),
    ]);
    const categoryByName = new Map(categories.map((x) => [x.name.toLowerCase(), x]));
    const typeByName = new Map(types.map((x) => [`${x.category.name.toLowerCase()}::${x.name.toLowerCase()}`, x]));
    const statusByName = new Map(statuses.map((x) => [x.name.toLowerCase(), x]));
    const userByEmail = new Map(users.map((x) => [x.email.toLowerCase(), x]));
    const existingNames = new Set(existingItems.map((x) => x.name.toLowerCase()));
    const existingNumbers = new Set(existingItems.map((x) => x.ciNumber?.toLowerCase()).filter(Boolean));
    const seenNames = new Set<string>();
    const seenNumbers = new Set<string>();
    const validatedRows = rows.map((raw, index) => {
      const normalizedInput = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? '').trim()]));
      const errors: string[] = [];
      const name = normalizedInput.name;
      const ciNumber = normalizedInput.ci_number || '';
      const category = categoryByName.get((normalizedInput.category || '').toLowerCase());
      const type = category ? typeByName.get(`${category.name.toLowerCase()}::${(normalizedInput.type || '').toLowerCase()}`) : undefined;
      const status = statusByName.get((normalizedInput.status || '').toLowerCase());
      const ownerEmail = normalizedInput.owner_email || '';
      const owner = ownerEmail ? userByEmail.get(ownerEmail.toLowerCase()) : undefined;
      if (!name) errors.push('name is required');
      if (!normalizedInput.category) errors.push('category is required');
      if (!normalizedInput.type) errors.push('type is required');
      if (!normalizedInput.status) errors.push('status is required');
      if (name && existingNames.has(name.toLowerCase())) errors.push('duplicate CI name already exists');
      if (name && seenNames.has(name.toLowerCase())) errors.push('duplicate CI name in CSV');
      if (ciNumber && existingNumbers.has(ciNumber.toLowerCase())) errors.push('duplicate CI number already exists');
      if (ciNumber && seenNumbers.has(ciNumber.toLowerCase())) errors.push('duplicate CI number in CSV');
      if (normalizedInput.category && !category) errors.push('unknown category');
      if (normalizedInput.type && category && !type) errors.push(`unknown type for category ${category.name}`);
      if (normalizedInput.status && !status) errors.push('unknown status');
      if (ownerEmail && !owner) errors.push('invalid owner_email');
      if (name) seenNames.add(name.toLowerCase());
      if (ciNumber) seenNumbers.add(ciNumber.toLowerCase());
      return {
        rowNumber: index + 2,
        raw,
        valid: errors.length === 0,
        errors,
        normalized: {
          name,
          ciNumber,
          categoryId: category?.id,
          typeId: type?.id,
          statusId: status?.id,
          environment: normalizedInput.environment || undefined,
          criticality: (normalizedInput.criticality || 'MEDIUM').toUpperCase(),
          ownerId: owner?.id,
          description: normalizedInput.description || undefined,
        },
      };
    });
    const errorList = validatedRows.flatMap((row) => row.errors.map((reason) => ({ rowNumber: row.rowNumber, reason })));
    return { totalRows: rows.length, validRows: validatedRows.filter((row) => row.valid).length, failedRows: validatedRows.filter((row) => !row.valid).length, rows: validatedRows, errors: errorList };
  }

  private async nextCiNumber(organizationId: string) {
    const count = await this.prisma.configurationItem.count({ where: { organizationId } });
    return `CI${(count + 1).toString().padStart(6, '0')}`;
  }

  private handleDuplicateCi(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Duplicate CI name or CI number');
    throw error;
  }

  private toCiDto(item: Prisma.ConfigurationItemGetPayload<{ include: typeof ciInclude }>) {
    return {
      id: item.id,
      ciNumber: item.ciNumber,
      name: item.name,
      description: item.description,
      category: item.ciCategory,
      type: item.ciType,
      ciType: item.ciType?.name,
      status: item.status,
      owner: item.owner,
      environment: item.environment,
      criticality: item.criticality,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      relationshipCount: item._count.parentRelationships + item._count.childRelationships,
    };
  }

  private toRelationshipDto(row: { id: string; status: string; description: string | null; createdAt: Date; updatedAt: Date; parentCi: { id: string; name: string; ciNumber: string | null }; childCi: { id: string; name: string; ciNumber: string | null }; relationshipType: { id: string; name: string }; createdBy: { id: string; name: string } }) {
    return { id: row.id, parentCi: row.parentCi, childCi: row.childCi, relationshipType: row.relationshipType, status: row.status, description: row.description, createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private relatedTickets(rows: { ticket: { id: string; ticketNumber: string; title: string; ticketType: { name: string } | null; status: { name: string } | null; assignmentGroup: { id: string; name: string } | null } }[], type: string) {
    return rows.filter((row) => row.ticket.ticketType?.name === type).map((row) => ({ id: row.ticket.id, ticketNumber: row.ticket.ticketNumber, title: row.ticket.title, status: row.ticket.status?.name, assignmentGroup: row.ticket.assignmentGroup }));
  }
}
