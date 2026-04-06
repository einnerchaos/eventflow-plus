import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/database/prisma.service';
import { Event } from '@prisma/client';

interface IdempotencyCheckResult {
  exists: boolean;
  originalEvent?: Event;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly idempotencyTtl: number;
  private readonly isEnabled: boolean;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Default: 24 hours in seconds
    this.idempotencyTtl = this.configService.get('IDEMPOTENCY_TTL_SECONDS', 86400) as number;
    this.isEnabled = this.configService.get('features.idempotency', true) as boolean;
  }

  /**
   * Check if an event with this correlationId already exists
   * First checks Redis (fast), then falls back to database
   */
  async checkIdempotency(
    sourceId: string,
    correlationId: string,
  ): Promise<IdempotencyCheckResult> {
    if (!this.isEnabled) {
      return { exists: false };
    }

    const key = this.buildKey(sourceId, correlationId);

    // 1. Check Redis (fast cache)
    try {
      const cachedEventId = await this.redis.get(key);
      
      if (cachedEventId) {
        const event = await this.prisma.event.findUnique({
          where: { id: cachedEventId },
        });

        if (event) {
          this.logger.debug(
            `Idempotency cache hit: source=${sourceId}, correlationId=${correlationId}`,
          );
          return { exists: true, originalEvent: event };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Redis check failed, falling back to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // 2. Fallback to database check
    const existingEvent = await this.prisma.event.findFirst({
      where: {
        sourceId,
        correlationId,
      },
      orderBy: {
        receivedAt: 'desc',
      },
    });

    if (existingEvent) {
      // Populate Redis cache for future lookups
      try {
        await this.redis.set(key, existingEvent.id, this.idempotencyTtl);
      } catch (error) {
        this.logger.warn(`Failed to populate idempotency cache: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      return { exists: true, originalEvent: existingEvent };
    }

    return { exists: false };
  }

  /**
   * Store idempotency key after creating event
   */
  async storeIdempotencyKey(
    sourceId: string,
    correlationId: string,
    eventId: string,
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const key = this.buildKey(sourceId, correlationId);

    try {
      await this.redis.set(key, eventId, this.idempotencyTtl);
      this.logger.debug(
        `Idempotency key stored: source=${sourceId}, correlationId=${correlationId}, eventId=${eventId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store idempotency key: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      // Don't throw - idempotency is a "nice to have" optimization
    }
  }

  /**
   * Remove idempotency key (for cleanup/testing)
   */
  async removeIdempotencyKey(
    sourceId: string,
    correlationId: string,
  ): Promise<void> {
    const key = this.buildKey(sourceId, correlationId);

    try {
      await this.redis.del(key);
      this.logger.debug(
        `Idempotency key removed: source=${sourceId}, correlationId=${correlationId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to remove idempotency key: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Batch check for multiple correlationIds
   * Useful for bulk event processing
   */
  async checkIdempotencyBatch(
    sourceId: string,
    correlationIds: string[],
  ): Promise<Map<string, IdempotencyCheckResult>> {
    const results = new Map<string, IdempotencyCheckResult>();

    for (const correlationId of correlationIds) {
      const result = await this.checkIdempotency(sourceId, correlationId);
      results.set(correlationId, result);
    }

    return results;
  }

  /**
   * Get stats about idempotency cache
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    keysBySource: Record<string, number>;
  }> {
    try {
      const keys = await this.redis.keys('idempotency:*');
      const keysBySource: Record<string, number> = {};

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 2) {
          const sourceId = parts[1];
          keysBySource[sourceId] = (keysBySource[sourceId] || 0) + 1;
        }
      }

      return {
        totalKeys: keys.length,
        keysBySource,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return { totalKeys: 0, keysBySource: {} };
    }
  }

  /**
   * Build Redis key for idempotency check
   */
  private buildKey(sourceId: string, correlationId: string): string {
    // Sanitize keys to prevent any injection
    const safeSourceId = sourceId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeCorrelationId = correlationId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    return `idempotency:${safeSourceId}:${safeCorrelationId}`;
  }
}
