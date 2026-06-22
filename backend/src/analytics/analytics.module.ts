import { Module } from '@nestjs/common';import { AuthModule } from '../auth/auth.module';import { AnalyticsController } from './analytics.controller';import { AnalyticsGuard } from './analytics.guard';import { AnalyticsService } from './analytics.service';
@Module({imports:[AuthModule],controllers:[AnalyticsController],providers:[AnalyticsGuard,AnalyticsService]})export class AnalyticsModule{}
