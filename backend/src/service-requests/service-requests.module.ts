import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SlaModule } from '../sla/sla.module';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  imports: [AuthModule, SlaModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
