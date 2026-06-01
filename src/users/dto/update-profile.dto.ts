import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;
}
