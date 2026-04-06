import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { IdempotencyService } from './services/idempotency.service';
import { EventProcessingService } from './services/event-processing.service';
import { Event, EventStatus, Prisma } from '@prisma/client';
import { QueryEventsDto } from './dto/query-events.dto';

interface SubmitEventInput {
  sourceId: string;
  eventType: string;
  correlationId?: string;
  payload: Record<string, any>;
}

interface SubmitEventResult {
  event: Event;
  isDuplicate: boolean;
  originalEvent?: Event;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventProcessing: EventProcessingService,
    @InjectQueue('event-processing') private readonly processingQueue: Queue,
  ) {}

  // ==========================================
  // EVENT SUBMISSION
  // ==========================================

  /**
   * Submit a new event for processing
   */
  async submitEvent(input: SubmitEventInput): Promise<SubmitEventResult> {
    const startTime = Date.now();
    
    try {
      // 1. Check idempotency (if correlationId provided)
      let isDuplicate = false;
      let originalEvent: Event | undefined;

      if (input.correlationId) {
        const idempotencyCheck = await this.idempotencyService.checkIdempotency(
          input.sourceId,
          input.correlationId,
        );

        if (idempotencyCheck.exists) {
          isDuplicate = true;
          originalEvent = idempotencyCheck.originalEvent;
          
          this.logger.log(
            `Duplicate event detected: source=${input.sourceId}, correlationId=${input.correlationId}`,
          );
          this.metrics.eventsFailed.inc({ reason: 'duplicate' });

          return {
            event: originalEvent!,
            isDuplicate: true,
            originalEvent,
          };
        }
      }

      // 2. Create event record
      const event = await this.prisma.event.create({
        data: {
          sourceId: input.sourceId,
          eventType: input.eventType,
          correlationId: input.correlationId,
          payload: input.payload as Prisma.InputJsonValue,
          status: EventStatus.RECEIVED,
          isDuplicate: false,
        },
      });

      // 3. Store idempotency key (if correlationId provided)
      if (input.correlationId) {
        await this.idempotencyService.storeIdempotencyKey(
          input.sourceId,
          input.correlationId,
          event.id,
        );
      }

      // 4. Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.recordEvent(input.sourceId, input.eventType, duration, true);

      this.logger.log(
        `Event submitted: id=${event.id}, type=${input.eventType}, source=${input.sourceId}`,
      );

      // 5. Queue for rule evaluation (async)
      await this.processingQueue.add(
        'process-event',
        { eventId: event.id },
        {
          jobId: `process-event-${event.id}`,
          delay: 0,
        },
      );

      // 6. Update status
      await this.prisma.event.update({
        where: { id: event.id },
        data: { status: EventStatus.PROCESSING },
      });

      return {
        event,
        isDuplicate: false,
      };
    } catch (error) {
      this.metrics.eventsFailed.inc({ reason: 'ingestion_error' });
      throw error;
    }
  }

  // ==========================================
  // EVENT RETRIEVAL
  // ==========================================

  /**
   * List events with filters
   */
  async listEvents(query: QueryEventsDto): Promise<{
    data: Event[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (query.sourceId) {
      where.sourceId = query.sourceId;
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.status) {
      where.status = query.status as EventStatus;
    }

    if (query.correlationId) {
      where.correlationId = query.correlationId;
    }

    if (query.fromDate || query.toDate) {
      where.receivedAt = {};
      if (query.fromDate) {
        where.receivedAt.gte = query.fromDate;
      }
      if (query.toDate) {
        where.receivedAt.lte = query.toDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          source: {
            select: { name: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single event with executions
   */
  async getEventWithExecutions(eventId: string): Promise<(Event & { executions: any[] }) | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        executions: {
          include: {
            rule: {
              select: { name: true, id: true },
            },
            failure: true,
            webhooks: true,
          },
        },
        source: {
          select: { name: true, id: true },
        },
      },
    });

    return event;
  }

  // ==========================================
  // EVENT REPROCESSING
  // ==========================================

  /**
   * Reprocess an existing event
   */
  async reprocessEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Reset status and re-queue
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.PROCESSING,
        matchedRules: 0,
      },
    });

    // Add to processing queue
    await this.processingQueue.add(
      'process-event',
      { eventId: event.id },
      {
        jobId: `reprocess-event-${event.id}-${Date.now()}`,
      },
    );

    this.logger.log(`Event ${eventId} queued for reprocessing by user ${userId}`);
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byType: Record<string, number>;
    duplicates: number;
    last24Hours: number;
  }> {
    const [
      total,
      byStatus,
      bySource,
      byType,
      duplicates,
      last24Hours,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.getCountByStatus(),
      this.getCountBySource(),
      this.getCountByType(),
      this.prisma.event.count({ where: { isDuplicate: true } }),
      this.prisma.event.count({
        where: {
          receivedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus,
      bySource,
      byType,
      duplicates,
      last24Hours,
    };
  }

  private async getCountByStatus(): Promise<Record<string, number>> {
    const results = await this.prisma.event.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return results.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getCountBySource(): Promise<Record<string, number>> {
    const results = await this.prisma.event.groupBy({
      by: ['sourceId'],
      _count: { sourceId: true },
    });

    // Get source names
    const sources = await this.prisma.appSource.findMany({
      where: { id: { in: results.map((r) => r.sourceId) } },
      select: { id: true, name: true },
    });

    const sourceMap = sources.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);

    return results.reduce((acc, item) => {
      const name = sourceMap[item.sourceId] || item.sourceId;
      acc[name] = item._count.sourceId;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getCountByType(): Promise<Record<string, number>> {
    const results = await this.prisma.event.groupBy({
      by: ['eventType'],
      _count: { eventType: true },
    });

    return results.reduce((acc, item) => {
      acc[item.eventType] = item._count.eventType;
      return acc;
    }, {} as Record<string, number>);
  }
}
