import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsController } from './attachments.controller';
@Module({ imports: [AuthModule], controllers: [AttachmentsController] })
export class AttachmentsModule {}
