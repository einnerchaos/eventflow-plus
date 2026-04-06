import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

// Configuration
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

// Common modules
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { LoggerModule } from './common/logger/logger.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { SourcesModule } from './sources/sources.module';
import { EventsModule } from './events/events.module';
import { RulesModule } from './rules/rules.module';
import { ExecutionsModule } from './executions/executions.module';
import { QueueModule } from './queue/queue.module';
import { WorkersModule } from './workers/workers.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

// Middleware
import { RequestIdMiddleware } from './middleware/request-id.middleware';

@Module({
  imports: [
    // ==========================================
    // CONFIGURATION
    // ==========================================
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ==========================================
    // SCHEDULING
    // ==========================================
    ScheduleModule.forRoot(),

    // ==========================================
    // QUEUE (BullMQ)
    // ==========================================
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host') as string,
          port: configService.get('redis.port') as number,
          db: configService.get('redis.db') as number,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // ==========================================
    // COMMON MODULES
    // ==========================================
    DatabaseModule,
    RedisModule,
    MetricsModule,
    LoggerModule,

    HealthModule,

    // ==========================================
    // FEATURE MODULES
    // ==========================================
    AuthModule,
    SourcesModule,
    EventsModule,
    RulesModule,
    ExecutionsModule,
    QueueModule,
    WorkersModule,
    WebhooksModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // Apply request ID to all routes
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}
