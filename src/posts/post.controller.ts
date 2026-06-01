import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { PostsService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/curent-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RequestWithUser } from '../types/request-with-user';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPostDto: CreatePostDto, @CurrentUser() user: User) {
    return this.postsService.create(createPostDto, user);
  }

  @Get()
  findAll(@Query('category') categoryId?: string) {
    return this.postsService.findAll(categoryId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.postsService.findByAuthor(Number(userId));
  }

  @Get('user/:userId/replies')
  findRepliesByUser(@Param('userId') userId: string) {
    return this.postsService.findRepliesByAuthor(Number(userId));
  }

  @Get('user/:userId/likes')
  findLikedPostsByUser(@Param('userId') userId: string) {
    return this.postsService.findLikedPostsByUser(Number(userId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: RequestWithUser,
  ) {
    return this.postsService.update(id, updatePostDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.postsService.remove(id, req.user);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.postsService.addComment(postId, req.user.id, createCommentDto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(@Param('id') postId: string, @Req() req: RequestWithUser) {
    return this.postsService.toggleLike(postId, req.user.id);
  }
}
