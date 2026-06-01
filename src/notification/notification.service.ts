import { Injectable, Optional } from '@nestjs/common';
import { NotificationsGateway } from './notification.gateway';

interface NotificationMessage {
  id: string;
  message: string;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly messages: NotificationMessage[] = [];

  constructor(@Optional() private readonly gateway?: NotificationsGateway) {}

  notifyAll(message: string) {
    this.storeMessage(message);
    if (this.gateway) {
      this.gateway.sendNotification(message);
    }
  }

  notifyPost(userId: string) {
    const message = `User ${userId} created a post`;
    this.storeMessage(message);
    if (this.gateway) {
      this.gateway.sendNotificationToAll(message);
    }
  }

  notifyComment(userLabel: string, postTitle: string) {
    const message = `${userLabel} commented on "${postTitle}"`;
    this.storeMessage(message);
    if (this.gateway) {
      this.gateway.sendNotificationToAll(message);
    }
  }

  notifyLike(userLabel: string, postTitle: string) {
    const message = `${userLabel} liked "${postTitle}"`;
    this.storeMessage(message);
    if (this.gateway) {
      this.gateway.sendNotificationToAll(message);
    }
  }

  getMessages(): NotificationMessage[] {
    return [...this.messages];
  }

  private storeMessage(message: string) {
    this.messages.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      createdAt: new Date(),
    });

    if (this.messages.length > 50) {
      this.messages.splice(50);
    }
  }
}
