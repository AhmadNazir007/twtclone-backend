import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

import { AppModule } from './app.module';

const expressApp = express();

let cachedServer: any;

async function bootstrapServer() {
  if (cachedServer) {
    return cachedServer;
  }

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
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.init();

  cachedServer = serverless(expressApp);

  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}