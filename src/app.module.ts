import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/post.module';
import { CategoryModule } from './category/category.module';
import { NotificationsModule } from './notification/notification.module';

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
      useFactory: (configService: ConfigService) => {
        const useUrl = !!configService.get('DATABASE_URL');
        const sslEnabled = configService.get('DB_SSL') === 'true';

        const base: any = {
          type: 'postgres',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize:
            configService.get('TYPEORM_SYNC') === undefined
              ? configService.get('NODE_ENV') !== 'production'
              : configService.get('TYPEORM_SYNC') === 'true',
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          extra: sslEnabled ? { ssl: { rejectUnauthorized: false } } : undefined,
        };

        if (useUrl) {
          base.url = String(configService.get('DATABASE_URL'));
        } else {
          base.host = String(configService.get('DB_HOST'));
          base.port = Number(configService.get('DB_PORT')) || 5432;
          base.username = String(configService.get('DB_USERNAME'));
          base.password = String(configService.get('DB_PASSWORD'));
          base.database = String(configService.get('DB_NAME'));
        }

        return base as any;
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



