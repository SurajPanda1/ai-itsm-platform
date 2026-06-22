import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AddRelatedItemDto } from './related-items.dto';

@Controller('tickets/:ticketId/related-items')
@UseGuards(JwtAuthGuard)
export class RelatedItemsController {
  constructor(private readonly prisma: PrismaService) {}
  private requireServiceDesk(user: AuthUser) { if (user.role === 'EMPLOYEE') throw new ForbiddenException('Related items are available to service desk roles'); }
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string) {
    this.requireServiceDesk(user);
    return this.prisma.$queryRaw(Prisma.sql`SELECT tr.id, tr.relationship_type AS "relationshipType", tr.created_at AS "createdAt", t.id AS "ticketId", t.ticket_number AS "ticketNumber", t.title, s.name AS status, tt.name AS "ticketType" FROM ticket_relationships tr JOIN tickets parent ON parent.id=tr.parent_ticket_id JOIN tickets t ON t.id=tr.related_ticket_id LEFT JOIN statuses s ON s.id=t.status_id LEFT JOIN ticket_types tt ON tt.id=t.ticket_type_id WHERE tr.parent_ticket_id=${ticketId}::uuid AND parent.organization_id=${user.organizationId}::uuid ORDER BY tr.created_at DESC`);
  }
  @Post()
  async add(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Body() dto: AddRelatedItemDto) {
    this.requireServiceDesk(user);
    const [parent, related] = await Promise.all([this.prisma.ticket.findFirst({where:{id:ticketId,organizationId:user.organizationId}}),this.prisma.ticket.findFirst({where:{ticketNumber:dto.relatedTicketNumber.toUpperCase(),organizationId:user.organizationId}})]);
    if (!parent || !related) throw new ForbiddenException('Both tickets must exist in your organization');
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO ticket_relationships(parent_ticket_id,related_ticket_id,relationship_type,created_by) VALUES(${ticketId}::uuid,${related.id}::uuid,${dto.relationshipType},${user.id}::uuid) ON CONFLICT DO NOTHING`);
    return { linked: true };
  }
}
