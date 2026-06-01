import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../types/request-with-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  getSuggestions(@Req() req: RequestWithUser) {
    return this.usersService.getFollowSuggestions(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: RequestWithUser) {
    return this.usersService.findPublicOne(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: RequestWithUser, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }


  @Get(':id')
  getOne(@Param('id') userId: string) {
    return this.usersService.findPublicOne(Number(userId));
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  followUser(@Param('id') followingId: string, @Req() req: RequestWithUser) {
    return this.usersService.followUser(req.user.id, Number(followingId));
  }

  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  unfollowUser(@Param('id') followingId: string, @Req() req: RequestWithUser) {
    return this.usersService.unfollowUser(req.user.id, Number(followingId));
  }

  @Get(':id/followers')
  getFollowers(@Param('id') userId: string) {
    return this.usersService.getFollowers(Number(userId));
  }

  @Get(':id/following')
  getFollowing(@Param('id') userId: string) {
    return this.usersService.getFollowing(Number(userId));
  }

  @Get(':id/is-following')
  @UseGuards(JwtAuthGuard)
  isFollowing(@Param('id') followingId: string, @Req() req: RequestWithUser) {
    return this.usersService.isFollowing(req.user.id, Number(followingId));
  }
}

