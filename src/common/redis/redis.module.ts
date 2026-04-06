import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_OPTIONS',
      useFactory: (configService: ConfigService) => ({
        host: configService.get('redis.host', 'localhost'),
        port: configService.get('redis.port', 6379),
        db: configService.get('redis.db', 0),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        showFriendlyErrorStack: configService.get('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
