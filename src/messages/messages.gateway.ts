import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        (client.handshake.query?.token as string);

      if (!token) {
        console.log('No token provided in messages connection');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        console.log('User not found during socket authentication');
        client.disconnect();
        return;
      }

      // Attach authenticated user to client
      client.data.user = user;
      const roomName = `user_${user.id}`;
      await client.join(roomName);
      console.log(`User ${user.id} (${user.email}) connected to MessagesGateway and joined room ${roomName}`);
    } catch (err) {
      console.log('Failed to authenticate messages websocket client:', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user) {
      console.log(`User ${user.id} disconnected from MessagesGateway`);
    } else {
      console.log(`Unauthenticated client ${client.id} disconnected`);
    }
  }

  notifyNewMessage(recipientId: number, senderId: number, message: any) {
    // Send to recipient's socket room
    this.server.to(`user_${recipientId}`).emit('new_message', message);
    // Send to sender's socket room (so other sessions of the sender update in real-time)
    this.server.to(`user_${senderId}`).emit('new_message', message);
  }
}
