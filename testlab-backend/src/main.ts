import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoadEnvironmentVariables } from './config/env';
import { ValidationPipe } from '@nestjs/common';
import { existsSync } from 'fs';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  LoadEnvironmentVariables();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Mirror your old Express: origin: "*"
  app.enableCors({
    origin: '*',
    credentials: false, // must be false when origin is *
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const templateRoots = [
    path.join(process.cwd(), 'src', 'documents', 'templates'),
    path.join(process.cwd(), 'dist', 'src', 'documents', 'templates'),
    path.join(process.cwd(), 'documents', 'templates'),
  ];

  for (const root of templateRoots) {
    if (existsSync(root)) {
      app.use('/templates', express.static(root));
      break;
    }
  }

  await app.listen(process.env.APP_PORT ?? 5000);
}
bootstrap();
