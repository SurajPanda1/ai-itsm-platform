import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateKnowledgeArticleDto, UpdateKnowledgeArticleDto } from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('knowledge')
  list(
    @CurrentUser() user: AuthUser,
    @Query('search') search = '',
    @Query('category') category = '',
    @Query('status') status = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.knowledge.list(user, search, category, status, page, limit);
  }

  @Get('knowledge/search')
  search(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    return this.knowledge.search(user, q);
  }

  @Post('knowledge')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKnowledgeArticleDto) {
    return this.knowledge.create(user, dto);
  }

  @Get('knowledge/:id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.detail(user, id);
  }

  @Patch('knowledge/:id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateKnowledgeArticleDto) {
    return this.knowledge.update(user, id, dto);
  }

  @Get('tickets/:ticketId/knowledge')
  linkedArticles(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.knowledge.linkedArticles(user, ticketId);
  }

  @Post('tickets/:ticketId/knowledge/:knowledgeArticleId')
  linkArticle(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Param('knowledgeArticleId', ParseUUIDPipe) knowledgeArticleId: string) {
    return this.knowledge.linkArticle(user, ticketId, knowledgeArticleId);
  }

  @Delete('tickets/:ticketId/knowledge/:knowledgeArticleId')
  unlinkArticle(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Param('knowledgeArticleId', ParseUUIDPipe) knowledgeArticleId: string) {
    return this.knowledge.unlinkArticle(user, ticketId, knowledgeArticleId);
  }
}
