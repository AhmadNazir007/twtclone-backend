import { Entity, OneToMany, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { Comment } from '../../posts/entities/comment.entity';
import { Like } from '../../posts/entities/like.entity';
import { Role } from 'src/auth/enum/roles.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @OneToMany(() => Comment, comment => comment.author)
  comments: Comment[];

  @OneToMany(() => Like, like => like.user)
  likes: Like[];

  @Column({ nullable: true })
  lastLogout?: Date;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User, // Default role is 'user'
  })
  role: Role;
}