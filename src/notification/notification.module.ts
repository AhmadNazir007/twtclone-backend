
import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notification.gateway';
import { NotificationsService } from './notification.service';

@Module({
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
