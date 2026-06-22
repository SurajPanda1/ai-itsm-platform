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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, AttachmentsModule, AssignmentGroupsModule, RelatedItemsModule, IncidentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
