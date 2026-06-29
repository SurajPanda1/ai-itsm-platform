import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigurationItemsController } from './configuration-items.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConfigurationItemsController],
})
export class ConfigurationItemsModule {}
