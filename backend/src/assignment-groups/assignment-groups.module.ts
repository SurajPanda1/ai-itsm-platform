import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssignmentGroupsController } from './assignment-groups.controller';

@Module({ imports: [AuthModule], controllers: [AssignmentGroupsController] })
export class AssignmentGroupsModule {}
