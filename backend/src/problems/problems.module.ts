import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}