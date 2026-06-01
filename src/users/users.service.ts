import { ConflictException, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '../auth/enum/roles.enum';

export type PublicUser = Omit<User, 'password'> & { username: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Follow)
    private followsRepository: Repository<Follow>,
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


  async findPublicOne(id: number): Promise<PublicUser> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user);
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

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, {
      name: updateProfileDto.name?.trim() || user.name,
      bio: updateProfileDto.bio?.trim() || null,
      location: updateProfileDto.location?.trim() || null,
      avatarUrl: updateProfileDto.avatarUrl?.trim() || null,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.toPublicUser(savedUser);
  }

  async followUser(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new ConflictException('You cannot follow yourself');
    }

    const follower = await this.findOne(followerId);
    const following = await this.findOne(followingId);

    if (!follower || !following) {
      throw new NotFoundException('User not found');
    }

    const existingFollow = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });

    if (existingFollow) {
      return { message: 'Already following this user' };
    }

    const follow = this.followsRepository.create({ follower, following });
    await this.followsRepository.save(follow);

    await this.usersRepository.increment({ id: followingId }, 'followersCount', 1);
    await this.usersRepository.increment({ id: followerId }, 'followingCount', 1);

    return { message: 'Successfully followed user' };
  }

  async unfollowUser(followerId: number, followingId: number) {
    const existingFollow = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });

    if (!existingFollow) {
      return { message: 'Not following this user' };
    }

    await this.followsRepository.remove(existingFollow);

    await this.usersRepository.decrement({ id: followingId }, 'followersCount', 1);
    await this.usersRepository.decrement({ id: followerId }, 'followingCount', 1);

    return { message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: number) {
    const follows = await this.followsRepository.find({
      where: { following: { id: userId } },
      relations: ['follower'],
    });
    return follows.map((follow) => this.toPublicUser(follow.follower));
  }

  async getFollowing(userId: number) {
    const follows = await this.followsRepository.find({
      where: { follower: { id: userId } },
      relations: ['following'],
    });
    return follows.map((follow) => this.toPublicUser(follow.following));
  }

  async isFollowing(followerId: number, followingId: number) {
    const follow = await this.followsRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    return { isFollowing: !!follow };
  }
   // -----------------------------------------------------------------
  // Suggestion endpoint helper – returns a short list of users the
  // current user might want to follow. It excludes the user themselves and
  // anyone they already follow, then orders by follower count.
  // -----------------------------------------------------------------
  async getFollowSuggestions(currentUserId: number): Promise<PublicUser[]> {
    // IDs the current user already follows
    const existing = await this.followsRepository.find({
      where: { follower: { id: currentUserId } },
      relations: ['following'],
    });
    const followingIds = existing.map((e) => e.following.id);

    // If the user follows nobody, ensure the NOT IN clause receives at least one value
    const excludedIds = followingIds.length ? followingIds : [0];

    const suggestions = await this.usersRepository
      .createQueryBuilder('u')
      .where('u.id != :currentUserId', { currentUserId })
      .andWhere('u.id NOT IN (:...excludedIds)', { excludedIds })
      .orderBy('u.followersCount', 'DESC')
      .limit(5)
      .getMany();
    return suggestions.map((u) => this.toPublicUser(u));
  }


}
 


