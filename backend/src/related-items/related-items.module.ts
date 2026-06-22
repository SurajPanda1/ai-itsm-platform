import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RelatedItemsController } from './related-items.controller';
@Module({ imports: [AuthModule], controllers: [RelatedItemsController] })
export class RelatedItemsModule {}
