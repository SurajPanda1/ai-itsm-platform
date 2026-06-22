import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AddCommentDto, AssignIncidentDto, ChangeStatusDto, ResolveIncidentDto } from './dto/incident-actions.dto';
import { IncidentsService } from './incidents.service';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncidentDto) { return this.incidents.create(user, dto); }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.incidents.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.incidents.findOne(user, id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidents.update(user, id, dto);
  }

  @Patch(':id/assignment')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignIncidentDto) {
    return this.incidents.assign(user, id, dto);
  }

  @Patch(':id/status')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.incidents.changeStatus(user, id, dto);
  }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCommentDto) {
    return this.incidents.addComment(user, id, dto);
  }

  @Patch(':id/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveIncidentDto) {
    return this.incidents.resolve(user, id, dto);
  }
}
