import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly config: ConfigService) {}
  @Get('configuration')
  configuration() {
    return { enabled: this.config.get('ATTACHMENTS_ENABLED') === 'true', provider: this.config.get('ATTACHMENT_PROVIDER') ?? null, maxFileSizeMb: Number(this.config.get('ATTACHMENT_MAX_SIZE_MB') ?? 10) };
  }
}
