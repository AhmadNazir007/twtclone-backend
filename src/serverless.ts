import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
const serverless = require('serverless-http');
import { AppModule } from './app.module';

const expressApp = express();
let cachedHandler: any;

async function bootstrapServer() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  await app.init();
  cachedHandler = serverless(expressApp);
}

module.exports = async (req: any, res: any) => {
  if (!cachedHandler) {
    await bootstrapServer();
  }
  return cachedHandler(req, res);
};
