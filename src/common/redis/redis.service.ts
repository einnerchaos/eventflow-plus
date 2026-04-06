import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface RedisOptions {
  host: string;
  port: number;
  db: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  showFriendlyErrorStack?: boolean;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;

  constructor(
    @Inject('REDIS_OPTIONS') private readonly options: RedisOptions,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Main Redis client for general operations
      this.client = new Redis({
        ...this.options,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn(`Redis reconnecting... attempt ${times}`);
          return delay;
        },
      });

      // Separate client for pub/sub operations
      this.subscriber = new Redis(this.options);

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connection established');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis error:', error.message);
      });

      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error:', error.message);
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Redis:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    this.logger.log('👋 Redis connections closed');
  }

  /**
   * Get the main Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get a Redis client for pub/sub operations
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /**
   * Get a new Redis connection (for BullMQ)
   */
  getNewConnection(): Redis {
    return new Redis({
      host: this.options.host,
      port: this.options.port,
      db: this.options.db,
    });
  }

  /**
   * Set a value with optional expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  /**
   * Set a key only if it doesn't exist (NX = Not eXists)
   * Useful for idempotency checks
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    return this.client.info();
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    return this.client.ping();
  }
}
