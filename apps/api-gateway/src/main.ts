import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { urlencoded } from 'express';
import { AppModule } from './app.module';

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(securityHeaders);
  app.use(urlencoded({ extended: true }));

  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins?.length ? origins : isProd ? false : ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api/v1');

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('OpsEdge360 API')
      .setDescription('Standalone enterprise observability platform')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('health')
      .addTag('auth')
      .addTag('executive')
      .addTag('cmdb')
      .addTag('discovery')
      .addTag('twin')
      .addTag('compliance')
      .addTag('agents')
      .addTag('observability')
      .addTag('transactions')
      .addTag('security')
      .addTag('copilot')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  if (isProd && process.env.AUTH_REQUIRED === 'false') {
    console.warn('[security] AUTH_REQUIRED=false is not recommended in production');
  }

  const port = process.env.API_GATEWAY_PORT ?? 4000;
  await app.listen(port);
  console.log(`OpsEdge360 API Gateway running on http://localhost:${port}`);
  if (process.env.SWAGGER_ENABLED !== 'false') {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
