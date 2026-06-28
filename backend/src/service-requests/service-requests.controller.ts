import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCommentDto, AssignIncidentDto, ChangeStatusDto } from '../incidents/dto/incident-actions.dto';
import { CreateApprovalRuleDto, CreateServiceCategoryDto, CreateServiceCatalogItemDto, CreateServiceRequestDto, DecideApprovalDto, UpdateApprovalRuleDto, UpdateRequestTaskDto, UpdateServiceCategoryDto, UpdateServiceCatalogItemDto } from './dto/service-catalog.dto';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
@UseGuards(JwtAuthGuard)
export class ServiceRequestsController {
  constructor(private readonly serviceRequests: ServiceRequestsService) {}

  @Get('catalog')
  catalog(@CurrentUser() user: AuthUser) {
    return this.serviceRequests.listCatalog(user);
  }

  @Post('catalog/categories')
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceCategoryDto) {
    return this.serviceRequests.createCategory(user, dto);
  }

  @Patch('catalog/categories/:id')
  updateCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.serviceRequests.updateCategory(user, id, dto);
  }

  @Post('catalog/items')
  createCatalogItem(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceCatalogItemDto) {
    return this.serviceRequests.createCatalogItem(user, dto);
  }

  @Patch('catalog/items/:id')
  updateCatalogItem(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceCatalogItemDto) {
    return this.serviceRequests.updateCatalogItem(user, id, dto);
  }

  @Post('catalog/approval-rules')
  createApprovalRule(@CurrentUser() user: AuthUser, @Body() dto: CreateApprovalRuleDto) {
    return this.serviceRequests.createApprovalRule(user, dto);
  }

  @Patch('catalog/approval-rules/:id')
  updateApprovalRule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateApprovalRuleDto) {
    return this.serviceRequests.updateApprovalRule(user, id, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceRequestDto) {
    return this.serviceRequests.createRequest(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.serviceRequests.findAll(user);
  }

  @Get('approvals/pending')
  pendingApprovals(@CurrentUser() user: AuthUser) {
    return this.serviceRequests.pendingApprovals(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceRequests.findOne(user, id);
  }

  @Patch(':id/status')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.serviceRequests.changeStatus(user, id, dto.status);
  }

  @Patch(':id/assignment')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignIncidentDto) {
    return this.serviceRequests.assign(user, id, dto);
  }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCommentDto) {
    return this.serviceRequests.addComment(user, id, dto);
  }

  @Patch(':id/approvals/:approvalId')
  decideApproval(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('approvalId', ParseUUIDPipe) approvalId: string, @Body() dto: DecideApprovalDto) {
    return this.serviceRequests.decideApproval(user, id, approvalId, dto);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('taskId', ParseUUIDPipe) taskId: string, @Body() dto: UpdateRequestTaskDto) {
    return this.serviceRequests.updateTask(user, id, taskId, dto);
  }
}
