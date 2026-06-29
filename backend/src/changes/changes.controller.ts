import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCommentDto, AssignIncidentDto } from '../incidents/dto/incident-actions.dto';
import { ChangesService } from './changes.service';
import { ChangeChangeStatusDto, CreateChangeDto, UpdateChangeDto } from './dto/change.dto';

@Controller('changes')
@UseGuards(JwtAuthGuard)
export class ChangesController {
  constructor(private readonly changes: ChangesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChangeDto) { return this.changes.create(user, dto); }

  @Get()
  findAll(@CurrentUser() user: AuthUser) { return this.changes.findAll(user); }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.changes.findOne(user, id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChangeDto) { return this.changes.update(user, id, dto); }

  @Patch(':id/assignment')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignIncidentDto) { return this.changes.assign(user, id, dto); }

  @Patch(':id/status')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeChangeStatusDto) { return this.changes.changeStatus(user, id, dto); }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCommentDto) { return this.changes.addComment(user, id, dto); }
}
