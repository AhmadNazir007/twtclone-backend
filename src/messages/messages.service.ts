import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly usersService: UsersService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  async findOrCreateConversation(userId: number, recipientId: number) {
    if (userId === recipientId) {
      throw new ConflictException('You cannot start a conversation with yourself');
    }

    // Check if conversation exists
    let conversation = await this.conversationsRepository.findOne({
      where: [
        { userOne: { id: userId }, userTwo: { id: recipientId } },
        { userOne: { id: recipientId }, userTwo: { id: userId } },
      ],
      relations: ['userOne', 'userTwo'],
    });

    if (!conversation) {
      const user = await this.usersService.findOne(userId);
      const recipient = await this.usersService.findOne(recipientId);

      if (!user || !recipient) {
        throw new NotFoundException('User not found');
      }

      conversation = this.conversationsRepository.create({
        userOne: user,
        userTwo: recipient,
      });

      conversation = await this.conversationsRepository.save(conversation);
    }

    const otherUser = conversation.userOne.id === userId ? conversation.userTwo : conversation.userOne;

    return {
      id: conversation.id,
      otherUser: this.usersService.toPublicUser(otherUser),
      updatedAt: conversation.updatedAt,
    };
  }

  async getConversations(userId: number) {
    const conversations = await this.conversationsRepository.find({
      where: [
        { userOne: { id: userId } },
        { userTwo: { id: userId } },
      ],
      relations: ['userOne', 'userTwo', 'messages', 'messages.sender'],
      order: { updatedAt: 'DESC' },
    });

    return conversations.map((conv) => {
      const otherUser = conv.userOne.id === userId ? conv.userTwo : conv.userOne;
      
      // Sort messages locally to ensure correct order
      const sortedMessages = conv.messages 
        ? [...conv.messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        : [];

      const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;

      return {
        id: conv.id,
        otherUser: this.usersService.toPublicUser(otherUser),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.sender.id,
            }
          : null,
        updatedAt: conv.updatedAt,
      };
    });
  }

  async getMessages(conversationId: string, userId: number) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
      relations: ['userOne', 'userTwo'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userOne.id !== userId && conversation.userTwo.id !== userId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Mark unread messages as read
    const unreadMessages = await this.messagesRepository.find({
      where: {
        conversation: { id: conversationId },
        recipient: { id: userId },
        readAt: IsNull(),
      },
    });

    if (unreadMessages.length > 0) {
      await this.messagesRepository.update(
        unreadMessages.map((m) => m.id),
        { readAt: new Date() },
      );
    }

    const messages = await this.messagesRepository.find({
      where: { conversation: { id: conversationId } },
      relations: ['sender', 'recipient'],
      order: { createdAt: 'ASC' },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      readAt: m.readAt,
      sender: this.usersService.toPublicUser(m.sender),
      recipient: this.usersService.toPublicUser(m.recipient),
    }));
  }

  async sendMessage(conversationId: string, senderId: number, content: string) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
      relations: ['userOne', 'userTwo'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userOne.id !== senderId && conversation.userTwo.id !== senderId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const recipient = conversation.userOne.id === senderId ? conversation.userTwo : conversation.userOne;
    const sender = await this.usersService.findOne(senderId);

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const message = this.messagesRepository.create({
      content,
      conversation,
      sender,
      recipient,
    });

    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation's updatedAt
    conversation.updatedAt = new Date();
    await this.conversationsRepository.save(conversation);

    const publicSender = this.usersService.toPublicUser(sender);
    const publicRecipient = this.usersService.toPublicUser(recipient);

    const formattedMessage = {
      id: savedMessage.id,
      content: savedMessage.content,
      conversationId: conversation.id,
      createdAt: savedMessage.createdAt,
      readAt: savedMessage.readAt,
      sender: publicSender,
      recipient: publicRecipient,
    };

    // Broadcast message via WebSockets
    this.messagesGateway.notifyNewMessage(recipient.id, senderId, formattedMessage);

    return formattedMessage;
  }
}
