import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';

@Module({ imports: [PrismaModule], controllers: [ProblemsController], providers: [ProblemsService] })
export class ProblemsModule {}
