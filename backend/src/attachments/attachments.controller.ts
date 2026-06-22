import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentStorageService } from './attachment-storage.service';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly prisma: PrismaService, private readonly storage: AttachmentStorageService) {}
  @Get('configuration')
  async configuration(@CurrentUser() user: AuthUser) {
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId }, select: { attachmentSettings: true } });
    const settings = organization.attachmentSettings as Record<string, unknown>;
    return { enabled: settings.enabled === true && settings.provider !== 'NONE', provider: settings.provider ?? null, maxFileSizeMb: settings.maxFileSizeMb ?? 10 };
  }
}

@Controller('tickets/:ticketId/attachments')
@UseGuards(JwtAuthGuard)
export class TicketAttachmentsController {
  constructor(private readonly storage: AttachmentStorageService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string) { return this.storage.list(user, ticketId); }
  @Post() @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  upload(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @UploadedFile() file?: { originalname:string; mimetype:string; size:number; buffer:Buffer }) { return this.storage.upload(user, ticketId, file); }
  @Get(':id/download') async download(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) response: Response) { const {attachment,body}=await this.storage.download(user,ticketId,id); response.setHeader('Content-Type',attachment.contentType); response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`); return new StreamableFile(body); }
  @Delete(':id') delete(@CurrentUser() user: AuthUser, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Param('id', ParseUUIDPipe) id: string) { return this.storage.delete(user,ticketId,id); }
}
