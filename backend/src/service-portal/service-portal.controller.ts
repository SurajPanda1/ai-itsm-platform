import { Body, Controller, Get, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateServicePortalSettingsDto } from './service-portal.dto';
import { ServicePortalService } from './service-portal.service';

@Controller('service-portal')
@UseGuards(JwtAuthGuard)
export class ServicePortalController {
  constructor(private readonly portal: ServicePortalService) {}

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.portal.settings(user);
  }

  @Put('settings')
  updateSettingsPut(@CurrentUser() user: AuthUser, @Body() dto: UpdateServicePortalSettingsDto) {
    return this.portal.updateSettings(user, dto);
  }

  @Patch('settings')
  updateSettingsPatch(@CurrentUser() user: AuthUser, @Body() dto: UpdateServicePortalSettingsDto) {
    return this.portal.updateSettings(user, dto);
  }

  @Get('banner')
  banner(@CurrentUser() user: AuthUser) {
    return this.portal.banner(user);
  }

  @Get('knowledge')
  knowledge(@CurrentUser() user: AuthUser, @Query('q') q = '', @Query('category') category = '') {
    return this.portal.knowledge(user, q, category);
  }

  @Get('my-incidents')
  myIncidents(@CurrentUser() user: AuthUser) {
    return this.portal.myIncidents(user);
  }

  @Get('my-requests')
  myRequests(@CurrentUser() user: AuthUser) {
    return this.portal.myRequests(user);
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.portal.profile(user);
  }
}
