import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './post.controller';
import { PostsService } from './post.service';
import { Post } from './entities/post.entity';
import { AuthModule } from '../auth/auth.module';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationsModule } from 'src/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, Like, User ]), AuthModule, NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports:[PostsService]
})
export class PostsModule {}