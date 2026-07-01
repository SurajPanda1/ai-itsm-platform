import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { Roles, serviceDeskRoles } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeArticleDto, UpdateKnowledgeArticleDto } from './knowledge.dto';

const articleSelect = {
  id: true,
  articleNumber: true,
  title: true,
  category: true,
  status: true,
  visibility: true,
  summary: true,
  content: true,
  keywords: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.KnowledgeArticleSelect;

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, search = '', category = '', status = '', page = 1, limit = 20) {
    this.requireView(user);
    const term = search.trim();
    const take = Math.min(Math.max(limit, 1), 20);
    const currentPage = Math.max(page, 1);
    const where: Prisma.KnowledgeArticleWhereInput = {
      organizationId: user.organizationId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(term ? this.searchWhere(term) : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({ where, select: articleSelect, orderBy: [{ updatedAt: 'desc' }], skip: (currentPage - 1) * take, take }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);
    return { data, page: currentPage, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) };
  }

  async search(user: AuthUser, q = '') {
    this.requireView(user);
    const term = q.trim();
    const tokens = this.tokens(term);
    const rows = await this.prisma.knowledgeArticle.findMany({
      where: { organizationId: user.organizationId, status: 'PUBLISHED', ...(term ? this.searchWhere(term) : {}) },
      select: { id: true, articleNumber: true, title: true, category: true, status: true, visibility: true, summary: true, content: true, keywords: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return rows
      .map((article) => ({ article, score: this.relevanceScore(article, term, tokens) }))
      .sort((a, b) => b.score - a.score || new Date(b.article.updatedAt).getTime() - new Date(a.article.updatedAt).getTime())
      .slice(0, 20)
      .map(({ article: { content: _content, keywords: _keywords, ...article } }) => article);
  }

  async detail(user: AuthUser, id: string) {
    this.requireView(user);
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id, organizationId: user.organizationId },
      select: articleSelect,
    });
    if (!article) throw new NotFoundException('Knowledge article not found');
    return article;
  }

  async create(user: AuthUser, dto: CreateKnowledgeArticleDto) {
    this.requireView(user);
    const status = dto.status ?? 'DRAFT';
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('knowledge_article_number'))`;
      const [sequence] = await tx.$queryRaw<{ next: number }[]>`
        SELECT (COALESCE(MAX(CAST(SUBSTRING(article_number FROM 3) AS INTEGER)), 0) + 1)::integer AS next
        FROM knowledge_articles
        WHERE article_number ~ '^KB[0-9]{6}$'
      `;
      const article = await tx.knowledgeArticle.create({
        data: {
          organizationId: user.organizationId,
          articleNumber: `KB${sequence.next.toString().padStart(6, '0')}`,
          title: dto.title,
          category: dto.category,
          status,
          visibility: dto.visibility ?? 'EMPLOYEES',
          summary: dto.summary,
          content: dto.content,
          keywords: dto.keywords,
          createdById: user.id,
          publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
        },
        select: articleSelect,
      });
      await tx.$executeRaw`UPDATE knowledge_articles SET updated_by=${user.id}::uuid WHERE id=${article.id}::uuid`;
      return article;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateKnowledgeArticleDto) {
    this.requireView(user);
    const current = await this.prisma.knowledgeArticle.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!current) throw new NotFoundException('Knowledge article not found');
    const nextStatus = dto.status ?? current.status;
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.knowledgeArticle.update({
        where: { id },
        data: {
          title: dto.title,
          category: dto.category,
          status: dto.status,
          visibility: dto.visibility,
          summary: dto.summary,
          content: dto.content,
          keywords: dto.keywords,
          publishedAt: current.status !== 'PUBLISHED' && nextStatus === 'PUBLISHED' ? new Date() : current.publishedAt,
          updatedAt: new Date(),
        },
        select: articleSelect,
      });
      await tx.$executeRaw`UPDATE knowledge_articles SET updated_by=${user.id}::uuid WHERE id=${id}::uuid`;
      return article;
    });
  }

  async linkedArticles(user: AuthUser, ticketId: string) {
    await this.ensureTicketAccess(user, ticketId);
    const rows = await this.prisma.ticketKnowledgeArticle.findMany({
      where: { organizationId: user.organizationId, ticketId },
      include: { knowledgeArticle: { select: { id: true, articleNumber: true, title: true, category: true, status: true, summary: true } }, linkedBy: { select: { id: true, name: true } } },
      orderBy: { linkedAt: 'desc' },
    });
    return rows.map((row) => ({ id: row.id, linkedAt: row.linkedAt, linkedBy: row.linkedBy, article: row.knowledgeArticle }));
  }

  async linkArticle(user: AuthUser, ticketId: string, articleId: string) {
    this.requireServiceDesk(user);
    const ticket = await this.ensureTicketAccess(user, ticketId);
    const article = await this.prisma.knowledgeArticle.findFirst({ where: { id: articleId, organizationId: user.organizationId, status: 'PUBLISHED' } });
    if (!article) throw new BadRequestException('Only published knowledge articles in this organization can be linked');
    const existing = await this.prisma.ticketKnowledgeArticle.findUnique({ where: { ticketId_knowledgeArticleId: { ticketId, knowledgeArticleId: articleId } } });
    if (existing) throw new BadRequestException('Knowledge article is already linked to this ticket');
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.ticketKnowledgeArticle.create({
        data: { organizationId: user.organizationId, ticketId, knowledgeArticleId: articleId, linkedById: user.id },
        include: { knowledgeArticle: { select: { id: true, articleNumber: true, title: true, category: true, status: true, summary: true } }, linkedBy: { select: { id: true, name: true } } },
      });
      const activityType = await tx.activityType.findUnique({ where: { name: 'WORK_NOTE' } });
      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          createdById: user.id,
          activityTypeId: activityType?.id,
          comment: `Knowledge article used: ${article.articleNumber} - ${article.title}`,
        },
      });
      await tx.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
      return { id: link.id, linkedAt: link.linkedAt, linkedBy: link.linkedBy, article: link.knowledgeArticle };
    });
  }

  async unlinkArticle(user: AuthUser, ticketId: string, articleId: string) {
    this.requireServiceDesk(user);
    await this.ensureTicketAccess(user, ticketId);
    await this.prisma.ticketKnowledgeArticle.deleteMany({ where: { organizationId: user.organizationId, ticketId, knowledgeArticleId: articleId } });
    return { deleted: true };
  }

  private searchWhere(term: string): Prisma.KnowledgeArticleWhereInput {
    const tokens = this.tokens(term);
    if (tokens.length > 1) {
      return {
        OR: tokens.flatMap((token) => [
          { title: { contains: token, mode: 'insensitive' as const } },
          { summary: { contains: token, mode: 'insensitive' as const } },
          { content: { contains: token, mode: 'insensitive' as const } },
          { keywords: { contains: token, mode: 'insensitive' as const } },
          { category: { contains: token, mode: 'insensitive' as const } },
          { articleNumber: { contains: token, mode: 'insensitive' as const } },
        ]),
      };
    }
    return {
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { summary: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { keywords: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { articleNumber: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  private tokens(term: string) {
    return term.toLowerCase().split(/[^a-z0-9]+/i).map((token) => token.trim()).filter((token) => token.length >= 2);
  }

  private relevanceScore(article: { title: string; summary: string | null; content: string | null; keywords: string | null; category: string; articleNumber: string }, term: string, tokens: string[]) {
    const full = term.toLowerCase();
    const fields = {
      articleNumber: article.articleNumber.toLowerCase(),
      title: article.title.toLowerCase(),
      keywords: (article.keywords || '').toLowerCase(),
      summary: (article.summary || '').toLowerCase(),
      content: (article.content || '').toLowerCase(),
      category: article.category.toLowerCase(),
    };
    let score = 0;
    if (full && fields.title.includes(full)) score += 120;
    if (full && fields.keywords.includes(full)) score += 90;
    for (const token of tokens) {
      if (fields.articleNumber.includes(token)) score += 80;
      if (fields.title.includes(token)) score += 40;
      if (fields.keywords.includes(token)) score += 35;
      if (fields.category.includes(token)) score += 20;
      if (fields.summary.includes(token)) score += 15;
      if (fields.content.includes(token)) score += 8;
    }
    return score;
  }

  private async ensureTicketAccess(user: AuthUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: user.organizationId,
        ...(this.canViewInternal(user) ? {} : { createdById: user.id }),
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private requireView(user: AuthUser) {
    if (user.roles.includes(Roles.Employee) && user.roles.length === 1) throw new ForbiddenException('Knowledge access requires a non-employee role');
  }

  private requireServiceDesk(user: AuthUser) {
    if (!this.canViewInternal(user)) throw new ForbiddenException('Using knowledge requires a service desk role');
  }

  private requireManage(user: AuthUser) {
    if (!this.canManage(user)) throw new ForbiddenException('Knowledge management requires IT Service Manager or Admin role');
  }

  private canViewInternal(user: AuthUser) {
    return user.roles.some((role) => serviceDeskRoles.includes(role));
  }

  private canManage(user: AuthUser) {
    return user.roles.some((role) => [Roles.ServiceManager, Roles.Admin].includes(role as typeof Roles.ServiceManager | typeof Roles.Admin));
  }
}
