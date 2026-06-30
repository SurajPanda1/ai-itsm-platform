import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateServicePortalSettingsDto } from './service-portal.dto';

type PortalSettingsRow = {
  organization_id: string;
  portal_enabled: boolean;
  portal_name: string;
  welcome_message: string;
  default_landing_page: string;
  knowledge_enabled: boolean;
  allow_kb_search: boolean;
  allow_kb_ratings: boolean;
  banner_enabled: boolean;
  banner_message: string | null;
  banner_background_color: string;
  banner_text_color: string;
  banner_priority: string;
  allow_incident_creation: boolean;
  allow_service_requests: boolean;
  allow_employee_close_ticket: boolean;
  show_recent_tickets: boolean;
  show_my_requests: boolean;
  created_at: Date;
  updated_at: Date;
};

const portalTicketInclude = {
  status: true,
  priority: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  incident: { include: { createdFor: { select: { id: true, name: true, email: true } } } },
  serviceRequest: {
    include: {
      requestedFor: { select: { id: true, name: true, email: true } },
      catalogItem: { include: { category: true } },
      approvals: { include: { approver: { select: { id: true, name: true, email: true } } }, orderBy: { sequence: 'asc' as const } },
      tasks: { include: { assignmentGroup: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' as const } },
    },
  },
  activities: {
    where: { activityType: { name: 'COMMENT' } },
    include: { createdBy: { select: { id: true, name: true } }, activityType: true },
    orderBy: { createdAt: 'desc' as const },
  },
  slas: { include: { definition: { select: { id: true, name: true, version: true } } }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class ServicePortalService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(user: AuthUser) {
    return this.mapSettings(await this.ensureSettings(user.organizationId));
  }

  async updateSettings(user: AuthUser, dto: UpdateServicePortalSettingsDto) {
    this.requireAdmin(user);
    const current = this.mapSettings(await this.ensureSettings(user.organizationId));
    const next = { ...current, ...dto };
    if (next.bannerEnabled && !next.bannerMessage?.trim()) {
      throw new BadRequestException('Banner message is mandatory when banner is enabled');
    }
    const [saved] = await this.prisma.$queryRaw<PortalSettingsRow[]>`
      INSERT INTO service_portal_settings (
        organization_id, portal_enabled, portal_name, welcome_message, default_landing_page,
        knowledge_enabled, allow_kb_search, allow_kb_ratings,
        banner_enabled, banner_message, banner_background_color, banner_text_color, banner_priority,
        allow_incident_creation, allow_service_requests, allow_employee_close_ticket,
        show_recent_tickets, show_my_requests, updated_at
      )
      VALUES (
        ${user.organizationId}::uuid, ${next.portalEnabled}, ${next.portalName}, ${next.welcomeMessage}, ${next.defaultLandingPage},
        ${next.knowledgeEnabled}, ${next.allowKbSearch}, ${next.allowKbRatings},
        ${next.bannerEnabled}, ${next.bannerMessage?.trim() || null}, ${next.bannerBackgroundColor}, ${next.bannerTextColor}, ${next.bannerPriority},
        ${next.allowIncidentCreation}, ${next.allowServiceRequests}, ${next.allowEmployeeCloseTicket},
        ${next.showRecentTickets}, ${next.showMyRequests}, now()
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        portal_enabled=EXCLUDED.portal_enabled,
        portal_name=EXCLUDED.portal_name,
        welcome_message=EXCLUDED.welcome_message,
        default_landing_page=EXCLUDED.default_landing_page,
        knowledge_enabled=EXCLUDED.knowledge_enabled,
        allow_kb_search=EXCLUDED.allow_kb_search,
        allow_kb_ratings=EXCLUDED.allow_kb_ratings,
        banner_enabled=EXCLUDED.banner_enabled,
        banner_message=EXCLUDED.banner_message,
        banner_background_color=EXCLUDED.banner_background_color,
        banner_text_color=EXCLUDED.banner_text_color,
        banner_priority=EXCLUDED.banner_priority,
        allow_incident_creation=EXCLUDED.allow_incident_creation,
        allow_service_requests=EXCLUDED.allow_service_requests,
        allow_employee_close_ticket=EXCLUDED.allow_employee_close_ticket,
        show_recent_tickets=EXCLUDED.show_recent_tickets,
        show_my_requests=EXCLUDED.show_my_requests,
        updated_at=now()
      RETURNING *
    `;
    return this.mapSettings(saved);
  }

  async banner(user: AuthUser) {
    const settings = this.mapSettings(await this.ensureSettings(user.organizationId));
    if (!settings.portalEnabled || !settings.bannerEnabled) {
      return { enabled: false };
    }
    return {
      enabled: true,
      message: settings.bannerMessage,
      backgroundColor: settings.bannerBackgroundColor,
      textColor: settings.bannerTextColor,
      priority: settings.bannerPriority,
    };
  }

  async knowledge(user: AuthUser, q = '', category = '') {
    const settings = this.mapSettings(await this.ensureSettings(user.organizationId));
    if (!settings.portalEnabled || !settings.knowledgeEnabled || !settings.allowKbSearch) return [];
    const term = q.trim();
    const pattern = `%${term}%`;
    const categoryFilter = category.trim();
    const rows = await this.prisma.$queryRaw<
      { id: string; articleNumber: string; title: string; category: string; status: string; visibility: string; summary: string | null; content: string | null; keywords: string | null; updatedAt: Date; publishedAt: Date | null }[]
    >`
      SELECT
        id,
        article_number AS "articleNumber",
        title,
        category,
        status,
        visibility,
        summary,
        content,
        keywords,
        updated_at AS "updatedAt",
        published_at AS "publishedAt"
      FROM knowledge_articles
      WHERE organization_id=${user.organizationId}::uuid
        AND status='PUBLISHED'
        AND visibility IN ('PUBLIC', 'EMPLOYEES')
        AND (${categoryFilter}='' OR category ILIKE ${categoryFilter})
        AND (
          ${term}='' OR title ILIKE ${pattern} OR summary ILIKE ${pattern}
          OR keywords ILIKE ${pattern} OR category ILIKE ${pattern} OR article_number ILIKE ${pattern}
        )
      ORDER BY
        CASE WHEN ${term}<>'' AND title ILIKE ${pattern} THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 20
    `;
    return rows.map(({ keywords: _keywords, ...article }) => article);
  }

  async myIncidents(user: AuthUser) {
    const settings = this.mapSettings(await this.ensureSettings(user.organizationId));
    if (!settings.portalEnabled) return [];
    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        ticketType: { name: 'INCIDENT' },
        OR: [{ createdById: user.id }, { incident: { createdForId: user.id } }],
      },
      include: portalTicketInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async myRequests(user: AuthUser) {
    const settings = this.mapSettings(await this.ensureSettings(user.organizationId));
    if (!settings.portalEnabled) return [];
    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        ticketType: { name: 'SERVICE_REQUEST' },
        OR: [{ createdById: user.id }, { serviceRequest: { requestedForId: user.id } }],
      },
      include: portalTicketInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async profile(user: AuthUser) {
    const [current] = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        department_id: string | null;
        department_name: string | null;
        manager_id: string | null;
        manager_name: string | null;
        manager_email: string | null;
      }[]
    >`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        d.id AS department_id,
        d.name AS department_name,
        m.id AS manager_id,
        m.name AS manager_name,
        m.email AS manager_email
      FROM users u
      LEFT JOIN departments d
        ON d.id = u.department_id
       AND d.organization_id = u.organization_id
      LEFT JOIN users m
        ON m.id = u.manager_id
       AND m.organization_id = u.organization_id
      WHERE u.id=${user.id}::uuid
        AND u.organization_id=${user.organizationId}::uuid
      LIMIT 1
    `;
    if (!current) throw new ForbiddenException('User profile is not available for this organization');
    return {
      id: current.id,
      name: current.name,
      email: current.email,
      phone: current.phone,
      department: current.department_id ? { id: current.department_id, name: current.department_name } : null,
      manager: current.manager_id ? { id: current.manager_id, name: current.manager_name, email: current.manager_email } : null,
      language: 'English',
    };
  }

  private async ensureSettings(organizationId: string) {
    const [row] = await this.prisma.$queryRaw<PortalSettingsRow[]>`
      INSERT INTO service_portal_settings (organization_id)
      VALUES (${organizationId}::uuid)
      ON CONFLICT (organization_id) DO UPDATE SET organization_id=EXCLUDED.organization_id
      RETURNING *
    `;
    return row;
  }

  private mapSettings(row: PortalSettingsRow) {
    return {
      organizationId: row.organization_id,
      portalEnabled: row.portal_enabled,
      portalName: row.portal_name,
      welcomeMessage: row.welcome_message,
      defaultLandingPage: row.default_landing_page,
      knowledgeEnabled: row.knowledge_enabled,
      allowKbSearch: row.allow_kb_search,
      allowKbRatings: row.allow_kb_ratings,
      bannerEnabled: row.banner_enabled,
      bannerMessage: row.banner_message || '',
      bannerBackgroundColor: row.banner_background_color,
      bannerTextColor: row.banner_text_color,
      bannerPriority: row.banner_priority,
      allowIncidentCreation: row.allow_incident_creation,
      allowServiceRequests: row.allow_service_requests,
      allowEmployeeCloseTicket: row.allow_employee_close_ticket,
      showRecentTickets: row.show_recent_tickets,
      showMyRequests: row.show_my_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private requireAdmin(user: AuthUser) {
    if (!user.roles.includes(Roles.Admin)) throw new ForbiddenException('Only admins can manage Service Portal settings');
  }
}
