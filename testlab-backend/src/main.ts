import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoadEnvironmentVariables } from './config/env';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  LoadEnvironmentVariables();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Mirror your old Express: origin: "*"
  app.enableCors({
    origin: '*',
    credentials: false, // must be false when origin is *
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.APP_PORT ?? 5000);
}
bootstrap();
