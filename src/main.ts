import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { MetricsService } from './common/metrics/metrics.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const metricsService = app.get(MetricsService);

  // ==========================================
  // SECURITY MIDDLEWARE
  // ==========================================
  app.use(helmet());
  app.use(compression());
  
  // CORS configuration
  const allowedOrigins = (configService.get('ALLOWED_ORIGINS', '') as string).split(',');
  app.enableCors({
    origin: allowedOrigins.length > 0 && allowedOrigins[0] !== '' 
      ? allowedOrigins 
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // ==========================================
  // API VERSIONING
  // ==========================================
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // ==========================================
  // GLOBAL PIPES & FILTERS
  // ==========================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(metricsService));
  app.useGlobalInterceptors(new LoggingInterceptor(metricsService));

  // ==========================================
  // SWAGGER DOCUMENTATION
  // ==========================================
  const swaggerEnabled = configService.get('SWAGGER_ENABLED', true) as boolean;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EventFlow+ API')
      .setDescription(`
        **Event-Driven Automation & Processing Platform**
        
        ## Authentication
        - **Admin Access**: Use JWT Bearer token
        - **Event Ingestion**: Use X-API-Key header
        
        ## Key Features
        - Event Ingestion with Idempotency
        - Rule Engine with AND/OR Conditions
        - Async Queue Processing
        - Failure Handling with Retry
      `)
      .setVersion('1.0.0')
      .setContact('Support', 'https://github.com/yourusername/eventflow-plus', 'support@eventflow.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'API-key')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Sources', 'Event source management')
      .addTag('Events', 'Event ingestion and retrieval')
      .addTag('Rules', 'Automation rule management')
      .addTag('Executions', 'Action execution monitoring')
      .addTag('Admin', 'Administrative endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    Logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
  }

  // ==========================================
  // METRICS ENDPOINT
  // ==========================================
  const metricsEnabled = configService.get('METRICS_ENABLED', true) as boolean;
  if (metricsEnabled) {
    const metricsPath = configService.get('METRICS_PATH', '/metrics') as string;
    app.getHttpAdapter().get(metricsPath, async (req, res) => {
      res.set('Content-Type', metricsService.getContentType());
      res.end(await metricsService.getMetrics());
    });
    Logger.log(`Prometheus metrics available at ${metricsPath}`, 'Bootstrap');
  }

  // ==========================================
  // START SERVER
  // ==========================================
  const port = configService.get('PORT', 3000) as number;
  await app.listen(port);

  Logger.log(`🚀 EventFlow+ server running on port ${port}`, 'Bootstrap');
  Logger.log(`📚 Environment: ${configService.get('NODE_ENV', 'development')}`, 'Bootstrap');
  Logger.log(`🔗 API Base URL: http://localhost:${port}/api/v1`, 'Bootstrap');
}

bootstrap();
