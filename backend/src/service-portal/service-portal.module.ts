import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicePortalController } from './service-portal.controller';
import { ServicePortalService } from './service-portal.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ServicePortalController],
  providers: [ServicePortalService],
})
export class ServicePortalModule {}
