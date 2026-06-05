import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip property yang tidak ada di DTO
      forbidNonWhitelisted: true, // throw error kalau ada property asing
      transform: true, // instantiasi DTO sebagai class, bukan plain object
      transformOptions: {
        enableImplicitConversion: true, // konversi type otomatis via TS metadata
      },
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
