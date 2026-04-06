import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from '../webhooks/webhooks.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { ActionType, ActionExecution } from '@prisma/client';

interface ActionJobData {
  executionId: string;
  eventId: string;
  ruleId: string;
  actionType: ActionType;
  actionConfig: any;
  attemptCount: number;
}

@Processor('action-execution', {
  concurrency: 5,
})
export class ActionExecutionWorker extends WorkerHost {
  private readonly logger = new Logger(ActionExecutionWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly webhooks: WebhooksService,
    private readonly metrics: MetricsService,
    @InjectQueue('dead-letter') private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  /**
   * After BullMQ exhausts all attempts, record DLQ row and final execution status.
   * (Intermediate failures only update the row in process() catch; retries are BullMQ backoff.)
   */
  @OnWorkerEvent('failed')
  async onActionJobFailed(job: Job<ActionJobData>, error: Error): Promise<void> {
    const maxAttempts = (job.opts.attempts as number) ?? 3;
    if ((job.attemptsMade ?? 0) < maxAttempts) {
      return;
    }

    const { executionId, actionType } = job.data;
    const execution = await this.prisma.actionExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || execution.status === 'SUCCESS') {
      return;
    }

    const existing = await this.prisma.failedExecution.findUnique({
      where: { executionId },
    });
    if (existing) {
      return;
    }

    await this.prisma.failedExecution.create({
      data: {
        executionId,
        finalAttemptAt: new Date(),
        finalError: execution.errorMessage || error.message || 'Unknown error',
        errorCategory: execution.errorCategory || 'UNKNOWN',
        stackTrace: (execution.errorDetails as { stack?: string } | null)?.stack,
        failureReason: 'UNRESOLVED',
        status: 'UNRESOLVED',
      },
    });

    await this.prisma.actionExecution.update({
      where: { id: executionId },
      data: { status: 'PERMANENTLY_FAILED' },
    });

    await this.deadLetterQueue.add(
      'failed-execution',
      {
        executionId,
        actionType,
        failedAt: new Date().toISOString(),
        reason: execution.errorMessage,
      },
      { jobId: `dead-letter-${executionId}` },
    );

    this.metrics.executionsDeadLettered.inc({
      error_category: execution.errorCategory || 'UNKNOWN',
    });
    this.logger.error(
      `Execution ${executionId} permanently failed after ${maxAttempts} attempts; recorded dead letter`,
    );
  }

  async process(job: Job<ActionJobData>): Promise<void> {
    const { executionId, actionType, actionConfig, attemptCount } = job.data;
    const startTime = Date.now();

    this.logger.log(`Executing action ${executionId}, type=${actionType}, attempt=${attemptCount + 1}`);

    try {
      // Update execution status to processing
      await this.prisma.actionExecution.update({
        where: { id: executionId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attemptCount: attemptCount + 1,
        },
      });

      // Execute the action
      let result: any;
      switch (actionType) {
        case 'CALL_WEBHOOK':
          result = await this.webhooks.callWebhook(executionId, actionConfig);
          break;
        case 'SEND_EMAIL':
          result = await this.executeEmailAction(executionId, actionConfig);
          break;
        case 'CREATE_NOTIFICATION':
          result = await this.executeNotificationAction(executionId, actionConfig);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      const duration = Date.now() - startTime;

      // Update execution as successful
      await this.prisma.actionExecution.update({
        where: { id: executionId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          result: result as any,
          durationMs: duration,
        },
      });

      // Update rule success count
      await this.prisma.automationRule.update({
        where: { id: job.data.ruleId },
        data: { successCount: { increment: 1 } },
      });

      // Record metrics
      this.metrics.executionDuration.observe({ action_type: actionType }, duration / 1000);
      this.metrics.executionsCompleted.inc({ action_type: actionType, status: 'success' });

      this.logger.log(`Action ${executionId} completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCategory = this.categorizeError(error);

      this.logger.error(`Action ${executionId} failed: ${errorMessage}`);

      // Update execution as failed (will trigger retry)
      await this.prisma.actionExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage,
          errorCategory,
          errorDetails: { stack: error instanceof Error ? error.stack : undefined } as any,
          durationMs: duration,
        },
      });

      // Update rule failure count
      await this.prisma.automationRule.update({
        where: { id: job.data.ruleId },
        data: { failureCount: { increment: 1 } },
      });

      this.metrics.executionsCompleted.inc({ action_type: actionType, status: 'failed' });

      // Re-throw to trigger BullMQ retry
      throw error;
    }
  }

  private categorizeError(error: any): string {
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return 'TIMEOUT';
    }
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return 'NETWORK';
    }
    if (message.includes('401') || message.includes('403')) {
      return 'AUTH';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'RATE_LIMITED';
    }
    if (message.includes('validation')) {
      return 'VALIDATION';
    }
    return 'UNKNOWN';
  }

  private async executeEmailAction(executionId: string, config: any): Promise<any> {
    // Email execution placeholder - integrate with your email service
    this.logger.log(`Executing email action ${executionId} to ${config.to}`);
    return { sent: true, to: config.to, subject: config.subject };
  }

  private async executeNotificationAction(executionId: string, config: any): Promise<any> {
    // Notification execution placeholder
    this.logger.log(`Executing notification action ${executionId}`);
    return { created: true, type: config.type };
  }
}
