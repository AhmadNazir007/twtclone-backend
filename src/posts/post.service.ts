import { Injectable, NotFoundException } from '@nestjs/common';
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
    await this.notificationsService.notifyPost(author.email);
    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find({ relations: ['author'] });
  }

  async findOne(id: string): Promise<Post | null> {
    return this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
    });
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post | null> {
    await this.postsRepository.update(id, updatePostDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {

    await this.postsRepository.delete(id);
  }

  async addComment(postId: string, userId: string, createCommentDto: CreateCommentDto) {

    const comment = this.commentsRepository.create({
    content: createCommentDto.content,
    author: { id: userId } as any, 
    post: { id: postId } as any,  
  });

  await this.commentsRepository.save(comment);
  
  await this.postsRepository.increment({ id: postId }, 'commentsCount', 1);

  return this.commentsRepository.findOne({
    where: { id: comment.id },
    relations: ['author', 'post']
  });
}

async toggleLike(postId: string, userId: string) {

  const post = await this.postsRepository.findOne({ where: { id: postId } });
  if (!post) {
      throw new NotFoundException('Post not found');
  }

  const existingLike = await this.likesRepository.findOne({
    where: {
      user: { id: userId } as any,
      post: { id: postId } as any,
    },
  });

  if (existingLike) {
      // Unlike
      await this.likesRepository.remove(existingLike);
      await this.postsRepository.decrement({ id: postId }, 'likesCount', 1);
      return { liked: false };
  } else {

      const user = await this.usersRepository.findOne({ where: { id: userId } as any });
      if (!user) {
          throw new NotFoundException('User not found');
      }

      const like = this.likesRepository.create({
          user: user, 
          post: post,   
      });

      await this.likesRepository.save(like);
      await this.postsRepository.increment({ id: postId }, 'likesCount', 1);
      return { liked: true };
  }
}

  async getPostWithRelations(postId: string) {
    return this.postsRepository.findOne({
      where: { id: postId },
      relations: ['author', 'comments', 'comments.author', 'likes', 'likes.user'],
    });
  }
}