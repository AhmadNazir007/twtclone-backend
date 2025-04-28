import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { NotificationsService } from 'src/notification/notification.service';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
}

  async login(loginDto: LoginDto): Promise<{ access_token: string, user: any }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload: { email: string; sub: number, roles:string } = { 
      email: user.email, 
      sub: user.id,
      roles: user.role
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    await this.notificationsService.notifyAll('New user registered!');
    return this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });
  }

  async logout(userId: string) {
    try {
      await this.usersService.updateLastLogout(userId);
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Logout failed for user ${userId}`, error.stack);
      throw new Error('Logout processing failed');
    }
  }
}