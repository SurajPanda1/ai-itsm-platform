import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AuthModule } from './auth/auth.module';
import { AssignmentGroupsModule } from './assignment-groups/assignment-groups.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { RelatedItemsModule } from './related-items/related-items.module';
import { AdminModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaModule } from './sla/sla.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot(), PrismaModule, AuthModule, SlaModule, AdminModule, AnalyticsModule, AttachmentsModule, AssignmentGroupsModule, RelatedItemsModule, IncidentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
