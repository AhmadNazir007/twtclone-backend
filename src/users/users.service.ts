import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../auth/enum/roles.enum';

export type PublicUser = Omit<User, 'password'> & { username: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  toPublicUser(user: User): PublicUser {
    const safeUser = { ...user } as Partial<User>;
    delete safeUser.password;

    return {
      ...safeUser,
      username: user.name ?? user.email,
    } as PublicUser;
  }

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const isAdmin = createUserDto.role === Role.Admin;

    if (isAdmin && createUserDto.adminToken !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid admin token');
    }

    const existingUser = await this.findOneByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role ?? Role.User,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.toPublicUser(savedUser);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateLastLogout(userId: number): Promise<void> {
    await this.usersRepository.update({ id: userId }, { lastLogout: new Date() });
  }
}
