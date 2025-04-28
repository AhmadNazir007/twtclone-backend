import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional,IsEnum } from 'class-validator';
import { Role } from 'src/auth/enum/roles.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role; 

  @IsOptional()
  adminToken?: string;
}