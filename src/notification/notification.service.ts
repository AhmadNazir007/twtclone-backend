
import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notification.gateway';

@Injectable()
export class NotificationsService {
  constructor(private gateway: NotificationsGateway) {}

    async notifyAll(message: string) {
    this.gateway.sendNotification(message);
  }

    async notifyPost(userId: string) {
    const message = `User ${userId} created a post`;
    this.gateway.sendNotificationToAll(message);
  }
}
