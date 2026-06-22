import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('branding')
  getBranding(@Query('domain') domain?: string) {
    return this.appService.getBranding(domain);
  }

  @Get('branding/assets/:organizationId/:kind')
  async getBrandAsset(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('kind') kind: string, @Res({ passthrough: true }) response: Response) {
    if (kind !== 'logo' && kind !== 'favicon') throw new NotFoundException();
    const asset = await this.appService.getBrandAsset(organizationId,kind);
    if (!asset) throw new NotFoundException();
    response.setHeader('Content-Type',asset.contentType);response.setHeader('Cache-Control','public, max-age=300');response.setHeader('Cross-Origin-Resource-Policy','cross-origin');
    return new StreamableFile(asset.body);
  }
}
