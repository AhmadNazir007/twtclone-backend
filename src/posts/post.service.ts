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
import { NotificationsService } from '../notification/notification.service';
import { Role } from '../auth/enum/roles.enum';
import { RequestWithUser } from '../types/request-with-user';
import { Category } from '../category/entities/category.entity';

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
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createPostDto: CreatePostDto, author: User): Promise<Post> {
    const { categoryId, mediaUrl, ...postData } = createPostDto;

    let category: Category | null = null;
    if (categoryId) {
      category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const post = this.postsRepository.create({
      ...postData,
      mediaUrl: mediaUrl?.trim() || null,
      author,
      category,
    });
    void this.notificationsService.notifyPost(author.email);
    return this.postsRepository.save(post);
  }

  async findAll(categoryId?: string): Promise<Post[]> {
    const where: any = {};
    if (categoryId) {
      where.category = { id: categoryId };
    }

    return this.postsRepository.find({
      where,
      relations: ['author', 'likes', 'likes.user', 'comments', 'comments.author', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAuthor(userId: number): Promise<Post[]> {
    return this.postsRepository.find({
      where: { author: { id: userId } },
      relations: ['author', 'likes', 'likes.user', 'comments', 'comments.author', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findRepliesByAuthor(userId: number): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { author: { id: userId } },
      relations: ['author', 'post', 'post.author', 'post.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findLikedPostsByUser(userId: number): Promise<Post[]> {
    const likes = await this.likesRepository.find({
      where: { user: { id: userId } },
      relations: ['post', 'post.author', 'post.likes', 'post.likes.user', 'post.comments', 'post.comments.author', 'post.category'],
      order: { createdAt: 'DESC' },
    });

    return likes.map((like) => like.post).filter(Boolean);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'likes', 'likes.user', 'comments', 'comments.author', 'category'],
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

    const { categoryId, mediaUrl, ...updateData } = updatePostDto;

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === '') {
        post.category = null;
      } else {
        const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
        post.category = category;
      }
    }

    Object.assign(post, updateData);
    if (mediaUrl !== undefined) {
      post.mediaUrl = mediaUrl.trim() || null;
    }
    await this.postsRepository.save(post);
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
    const post = await this.ensurePostExists(postId);

    const comment = this.commentsRepository.create({
      content: createCommentDto.content,
      author: { id: userId } as User,
      post: { id: postId } as Post,
    });

    await this.commentsRepository.save(comment);
    await this.postsRepository.increment({ id: postId }, 'commentsCount', 1);

    const savedComment = await this.commentsRepository.findOne({
      where: { id: comment.id },
      relations: ['author', 'post'],
    });

    const userLabel = savedComment?.author?.name || savedComment?.author?.email || `User ${userId}`;
    this.notificationsService.notifyComment(userLabel, post.title);

    return savedComment;
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
    this.notificationsService.notifyLike(user.name || user.email, post.title);
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

