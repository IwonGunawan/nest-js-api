import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const port = process.env.PORT || 3000;
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
  app.enableCors({ origin: 'http://localhost:5173' });
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
