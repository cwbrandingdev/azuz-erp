import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const DEFAULT_CORS_ORIGINS = [
  'https://atria-erp.vercel.app',
  'https://azuz.cwbranding.com.br',
  'https://atria-erp.vercel.com',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.use(cookieParser());

  const configuredOrigins = (configService.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map((origin) =>
      origin
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\/$/, ''),
    )
    .filter(Boolean);

  const allowedOrigins = [
    ...new Set([...DEFAULT_CORS_ORIGINS, ...configuredOrigins]),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger / OpenAPI is intentionally not mounted in any environment.

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  const appUrl = await app.getUrl();
  console.log(`Application is running on: ${appUrl}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
