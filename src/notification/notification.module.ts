
import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notification.gateway';
import { NotificationsService } from './notification.service';
import { NotificationsController } from './notification.controller';

const notificationProviders: any[] = [NotificationsService];
if (process.env.ENABLE_SOCKET !== 'false') {
  notificationProviders.unshift(NotificationsGateway);
}

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: notificationProviders,
  exports: [NotificationsService],
})
export class NotificationsModule {}
