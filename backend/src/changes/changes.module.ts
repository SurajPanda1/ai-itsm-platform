import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangesController } from './changes.controller';
import { ChangesService } from './changes.service';

@Module({ imports: [AuthModule], controllers: [ChangesController], providers: [ChangesService] })
export class ChangesModule {}
