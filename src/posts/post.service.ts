import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../users/entities/user.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from 'src/notification/notification.service';
import { Role } from 'src/auth/enum/roles.enum';
import { RequestWithUser } from 'src/types/request-with-user';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Like)
    private likesRepository: Repository<Like>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createPostDto: CreatePostDto, author: User): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      author,
    });
    this.notificationsService.notifyPost(author.email);
    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'likes', 'likes.user', 'comments', 'comments.author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'likes', 'likes.user', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    user: RequestWithUser['user'],
  ): Promise<Post> {
    const post = await this.findOne(id);
    this.assertCanModifyPost(post, user);

    await this.postsRepository.update(id, updatePostDto);
    return this.findOne(id);
  }

  async remove(id: string, user: RequestWithUser['user']): Promise<{ message: string }> {
    const post = await this.findOne(id);
    this.assertCanModifyPost(post, user);

    await this.postsRepository.delete(id);
    return { message: 'Post deleted successfully' };
  }

  async addComment(
    postId: string,
    userId: number,
    createCommentDto: CreateCommentDto,
  ) {
    await this.ensurePostExists(postId);

    const comment = this.commentsRepository.create({
      content: createCommentDto.content,
      author: { id: userId } as User,
      post: { id: postId } as Post,
    });

    await this.commentsRepository.save(comment);
    await this.postsRepository.increment({ id: postId }, 'commentsCount', 1);

    return this.commentsRepository.findOne({
      where: { id: comment.id },
      relations: ['author', 'post'],
    });
  }

  async toggleLike(postId: string, userId: number) {
    const post = await this.ensurePostExists(postId);

    const existingLike = await this.likesRepository.findOne({
      where: {
        user: { id: userId },
        post: { id: postId },
      },
    });

    if (existingLike) {
      await this.likesRepository.remove(existingLike);
      await this.postsRepository.decrement({ id: postId }, 'likesCount', 1);
      return { liked: false };
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const like = this.likesRepository.create({
      user,
      post,
    });

    await this.likesRepository.save(like);
    await this.postsRepository.increment({ id: postId }, 'likesCount', 1);
    return { liked: true };
  }

  async getPostWithRelations(postId: string) {
    return this.findOne(postId);
  }

  private async ensurePostExists(postId: string): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private assertCanModifyPost(post: Post, user: RequestWithUser['user']) {
    const isOwner = post.author?.id === user.id;
    const isAdmin = user.role === Role.Admin || user.roles === Role.Admin;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only modify your own posts');
    }
  }
}
