import { Controller, Get } from '@nestjs/common';
import { NotificationsService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(): any {
    return this.notificationsService.getMessages();
  }
}
