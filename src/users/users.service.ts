import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from 'src/auth/enum/roles.enum';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> { 

    const isAdmin = createUserDto.role === Role.Admin;

    if (isAdmin) {
      if (createUserDto.adminToken !== process.env.ADMIN_SECRET) {
        throw new UnauthorizedException('Invalid admin token');
      }
    }
    const user = this.usersRepository.create({...createUserDto, role: createUserDto.role ?? Role.User});
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return  this.usersRepository.find();
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updateLastLogout(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId as any },
      { lastLogout: new Date() }
    );
  }
}