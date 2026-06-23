import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCommentDto, AssignIncidentDto, ChangeStatusDto } from '../incidents/dto/incident-actions.dto';
import { CreateProblemDto, CreateProblemTaskDto, UpdateProblemDto, UpdateProblemTaskDto } from './dto/problem.dto';
import { ProblemsService } from './problems.service';

@Controller('problems')
@UseGuards(JwtAuthGuard)
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProblemDto) { return this.problems.create(user, dto); }

  @Get()
  findAll(@CurrentUser() user: AuthUser) { return this.problems.findAll(user); }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.problems.findOne(user, id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProblemDto) { return this.problems.update(user, id, dto); }

  @Patch(':id/assignment')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignIncidentDto) { return this.problems.assign(user, id, dto); }

  @Patch(':id/status')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) { return this.problems.changeStatus(user, id, dto); }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCommentDto) { return this.problems.addComment(user, id, dto); }

  @Post(':id/tasks')
  createTask(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProblemTaskDto) { return this.problems.createTask(user, id, dto); }

  @Patch(':id/tasks/:taskId')
  updateTask(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('taskId', ParseUUIDPipe) taskId: string, @Body() dto: UpdateProblemTaskDto) { return this.problems.updateTask(user, id, taskId, dto); }
}
