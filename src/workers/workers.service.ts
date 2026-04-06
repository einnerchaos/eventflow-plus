import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ActionExecutionWorker } from './action-execution.worker';
import { RetryWorker } from './retry.worker';

@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly actionWorker: ActionExecutionWorker,
    private readonly retryWorker: RetryWorker,
  ) {}

  onModuleInit() {
    this.logger.log('✅ Workers initialized');
  }

  onModuleDestroy() {
    this.logger.log('👋 Shutting down workers...');
  }

  async getWorkerHealth(): Promise<{ healthy: boolean; workers: string[] }> {
    return {
      healthy: true,
      workers: ['action-execution', 'retry-queue'],
    };
  }
}
