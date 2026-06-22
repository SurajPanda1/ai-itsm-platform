import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsController, TicketAttachmentsController } from './attachments.controller';
import { AttachmentConnectionService } from './attachment-connection.service';
import { AttachmentStorageService } from './attachment-storage.service';
@Module({ imports: [AuthModule], controllers: [AttachmentsController, TicketAttachmentsController], providers: [AttachmentConnectionService, AttachmentStorageService], exports: [AttachmentConnectionService, AttachmentStorageService] })
export class AttachmentsModule {}
