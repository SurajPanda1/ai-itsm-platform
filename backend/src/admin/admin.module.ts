import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({ imports: [AuthModule, AttachmentsModule], controllers: [AdminController], providers: [AdminGuard] })
export class AdminModule {}
