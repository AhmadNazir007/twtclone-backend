import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './post.controller';
import { PostsService } from './post.service';
import { Post } from './entities/post.entity';
import { AuthModule } from '../auth/auth.module';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notification/notification.module';
import { Category } from '../category/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, Like, User, Category]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}