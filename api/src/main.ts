import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { raw } from 'express';
import { types } from 'pg';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// The `pg` driver returns PostgreSQL `numeric`/`decimal` columns as strings by default
// (to avoid silent precision loss on very large values), which is why every money field
// on Order/OrderItem/Payment/InventoryItem — subtotal, total, unit_price, etc. — arrives
// at the frontend as e.g. "349.00" instead of 349, breaking any `.toFixed()` call on it.
// Parsing them as floats here (OID 1700 = numeric) is the standard fix; this project's
// amounts are well within float precision limits, so the tradeoff is fine.
types.setTypeParser(1700, (value: string) => parseFloat(value));

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.enableCors({ origin: true, credentials: true });
  app.use(cookieParser());

  // Stripe webhook signature verification needs the raw request body. Using express.raw()
  // (not express.json()) here also matters for a reason beyond that: Nest's own global
  // JSON parser registration checks the Express middleware stack by function *name* and
  // skips re-adding itself if it sees anything already named "jsonParser" — which an
  // express.json() call here would be, even though it's scoped to this one path. That
  // silently broke body parsing for every other route. express.raw() has a different
  // internal name, so it doesn't collide with Nest's default JSON/urlencoded parsers.
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('eCommerce API')
    .setDescription('Shared backend for the website and seller/admin application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
