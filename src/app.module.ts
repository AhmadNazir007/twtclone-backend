import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { NotificationsModule } from './notification/notification.module';
import { PostsModule } from './posts/post.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        if (!config.JWT_SECRET) {
          throw new Error('JWT_SECRET is required in environment variables');
        }
        return config;
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const sslEnabled = configService.get<string>('DB_SSL') === 'true';
        const synchronize =
          configService.get<string>('TYPEORM_SYNC') === undefined
            ? configService.get<string>('NODE_ENV') !== 'production'
            : configService.get<string>('TYPEORM_SYNC') === 'true';

        const common = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          extra: sslEnabled ? { ssl: { rejectUnauthorized: false } } : undefined,
        };

        if (databaseUrl) {
          return {
            ...common,
            url: databaseUrl,
          };
        }

        return {
          ...common,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<string>('DB_PORT')) || 5432,
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PostsModule,
    CategoryModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
