import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../types/request-with-user';
import { MessagesService } from './messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.messagesService.findOrCreateConversation(
      req.user.id,
      createConversationDto.recipientId,
    );
  }

  @Get('conversations')
  getConversations(@Req() req: RequestWithUser) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') conversationId: string, @Req() req: RequestWithUser) {
    return this.messagesService.getMessages(conversationId, req.user.id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.messagesService.sendMessage(
      conversationId,
      req.user.id,
      sendMessageDto.content,
    );
  }
}
