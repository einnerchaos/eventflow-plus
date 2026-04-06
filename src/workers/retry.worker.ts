import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../common/metrics/metrics.service';
import { ActionType } from '@prisma/client';

interface RetryJobData {
  executionId: string;
  eventId: string;
  ruleId: string;
  actionType: ActionType;
  actionConfig: any;
  attemptCount: number;
  maxAttempts: number;
}

@Processor('retry-queue', {
  concurrency: 3,
})
export class RetryWorker extends WorkerHost {
  private readonly logger = new Logger(RetryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
    @InjectQueue('action-execution') private readonly actionQueue: Queue,
    @InjectQueue('dead-letter') private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<RetryJobData>): Promise<void> {
    const { executionId, attemptCount, maxAttempts } = job.data;

    this.logger.log(`Processing retry for execution ${executionId}, attempt ${attemptCount}/${maxAttempts}`);

    // Check if max attempts reached
    if (attemptCount >= maxAttempts) {
      this.logger.warn(`Max attempts reached for execution ${executionId}, moving to dead letter`);
      await this.moveToDeadLetter(job.data);
      return;
    }

    // Calculate exponential backoff delay
    const baseDelay = this.configService.get('retry.baseDelayMs', 1000) as number;
    const maxDelay = this.configService.get('retry.maxDelayMs', 60000) as number;
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);

    this.logger.log(`Scheduling retry ${attemptCount + 1} with delay ${delay}ms`);

    // Update execution status
    await this.prisma.actionExecution.update({
      where: { id: executionId },
      data: {
        status: 'RETRYING',
        nextRetryAt: new Date(Date.now() + delay),
      },
    });

    // Re-queue with delay
    await this.actionQueue.add(
      'execute-action',
      {
        ...job.data,
        attemptCount: attemptCount,
      },
      {
        delay,
        priority: 5, // Lower priority than new jobs
        jobId: `retry-${executionId}-${attemptCount + 1}`,
      },
    );

    this.metrics.executionsRetried.inc({ attempt_number: String(attemptCount + 1) });
  }

  private async moveToDeadLetter(data: RetryJobData): Promise<void> {
    const { executionId, actionType } = data;

    // Get execution details
    const execution = await this.prisma.actionExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      this.logger.error(`Execution ${executionId} not found for dead letter`);
      return;
    }

    // Create dead letter record
    await this.prisma.failedExecution.create({
      data: {
        executionId,
        finalAttemptAt: new Date(),
        finalError: execution.errorMessage || 'Unknown error',
        errorCategory: execution.errorCategory || 'UNKNOWN',
        stackTrace: (execution.errorDetails as any)?.stack,
        failureReason: 'UNRESOLVED',
        status: 'UNRESOLVED',
      },
    });

    // Update execution status
    await this.prisma.actionExecution.update({
      where: { id: executionId },
      data: {
        status: 'PERMANENTLY_FAILED',
      },
    });

    // Add to dead letter queue for monitoring
    await this.deadLetterQueue.add(
      'failed-execution',
      {
        executionId,
        actionType,
        failedAt: new Date().toISOString(),
        reason: execution.errorMessage,
      },
      {
        jobId: `dead-letter-${executionId}`,
      },
    );

    this.metrics.executionsDeadLettered.inc({ error_category: execution.errorCategory || 'UNKNOWN' });
    this.logger.error(`Execution ${executionId} moved to dead letter queue`);
  }
}
