import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AddRelatedItemDto } from './related-items.dto';
import { requireServiceDeskRole } from '../common/ticket-access.policy';
import { validateTicketRelationship } from '../common/ticket-relationship.policy';

@Controller('tickets/:ticketId/related-items')
@UseGuards(JwtAuthGuard)
export class RelatedItemsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string) {
    requireServiceDeskRole(user);
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT * FROM (
        SELECT tr.id, tr.relationship_type AS "relationshipType", 'OUTBOUND' AS direction,
               tr.created_at AS "createdAt", t.id AS "ticketId", t.ticket_number AS "ticketNumber",
               t.title, s.name AS status, tt.name AS "ticketType", ag.name AS "assignmentGroup"
        FROM ticket_relationships tr
        JOIN tickets parent ON parent.id = tr.parent_ticket_id
        JOIN tickets t ON t.id = tr.related_ticket_id
        LEFT JOIN statuses s ON s.id = t.status_id
        LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
        LEFT JOIN assignment_groups ag ON ag.id = t.assignment_group_id
        WHERE tr.parent_ticket_id = ${ticketId}::uuid
          AND parent.organization_id = ${user.organizationId}::uuid
        UNION ALL
        SELECT tr.id,
               CASE tr.relationship_type
                 WHEN 'CHILD_INCIDENT' THEN 'PARENT_INCIDENT'
                 WHEN 'RELATED_CHANGE' THEN 'RELATED_INCIDENT'
                 WHEN 'RELATED_PROBLEM' THEN 'RELATED_INCIDENT'
                 WHEN 'CAUSED_BY_CHANGE' THEN 'CAUSED_INCIDENT'
                 WHEN 'CAUSED_INCIDENT' THEN 'CAUSED_BY_CHANGE'
                 WHEN 'IMPLEMENTED_BY_CHANGE' THEN 'IMPLEMENTS'
               END AS "relationshipType",
               'INBOUND' AS direction, tr.created_at AS "createdAt",
               parent.id AS "ticketId", parent.ticket_number AS "ticketNumber",
               parent.title, parent_status.name AS status, parent_type.name AS "ticketType", parent_group.name AS "assignmentGroup"
        FROM ticket_relationships tr
        JOIN tickets child ON child.id = tr.related_ticket_id
        JOIN tickets parent ON parent.id = tr.parent_ticket_id
        LEFT JOIN statuses parent_status ON parent_status.id = parent.status_id
        LEFT JOIN ticket_types parent_type ON parent_type.id = parent.ticket_type_id
        LEFT JOIN assignment_groups parent_group ON parent_group.id = parent.assignment_group_id
        WHERE tr.related_ticket_id = ${ticketId}::uuid
          AND child.organization_id = ${user.organizationId}::uuid
      ) relationships
      ORDER BY "createdAt" DESC
    `);
  }
  @Post()
  async add(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Body() dto: AddRelatedItemDto) {
    requireServiceDeskRole(user);
    const [parent, related] = await Promise.all([this.prisma.ticket.findFirst({where:{id:ticketId,organizationId:user.organizationId}}),this.prisma.ticket.findFirst({where:{ticketNumber:dto.relatedTicketNumber.toUpperCase(),organizationId:user.organizationId}})]);
    if (!parent || !related) throw new ForbiddenException('Both tickets must exist in your organization');
    const duplicate = await this.prisma.$queryRaw<{ exists: boolean }[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM ticket_relationships WHERE parent_ticket_id=${ticketId}::uuid AND related_ticket_id=${related.id}::uuid AND relationship_type=${dto.relationshipType}) AS exists`);
    validateTicketRelationship(parent.id, related.id, duplicate[0]?.exists ?? false);
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO ticket_relationships(parent_ticket_id,related_ticket_id,relationship_type,created_by) VALUES(${ticketId}::uuid,${related.id}::uuid,${dto.relationshipType},${user.id}::uuid) ON CONFLICT DO NOTHING`);
    return { linked: true };
  }
}
