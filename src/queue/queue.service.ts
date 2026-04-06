import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('action-execution') private readonly actionQueue: Queue,
    @InjectQueue('retry-queue') private readonly retryQueue: Queue,
    @InjectQueue('dead-letter') private readonly deadLetterQueue: Queue,
  ) {}

  async getQueueStats(): Promise<{
    actionExecution: { waiting: number; active: number; completed: number; failed: number; delayed: number };
    retry: { waiting: number; active: number; completed: number; failed: number; delayed: number };
    deadLetter: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  }> {
    const [actionExecution, retry, deadLetter] = await Promise.all([
      this.getQueueInfo(this.actionQueue),
      this.getQueueInfo(this.retryQueue),
      this.getQueueInfo(this.deadLetterQueue),
    ]);

    return { actionExecution, retry, deadLetter };
  }

  private async getQueueInfo(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getQueueJobs(queueName: string, status: string, limit: number = 20) {
    const queue = this.getQueueByName(queueName);
    if (!queue) return [];

    switch (status) {
      case 'waiting':
        return queue.getWaiting(0, limit);
      case 'active':
        return queue.getActive(0, limit);
      case 'completed':
        return queue.getCompleted(0, limit);
      case 'failed':
        return queue.getFailed(0, limit);
      case 'delayed':
        return queue.getDelayed(0, limit);
      default:
        return [];
    }
  }

  private getQueueByName(name: string): Queue | null {
    switch (name) {
      case 'action-execution':
        return this.actionQueue;
      case 'retry-queue':
        return this.retryQueue;
      case 'dead-letter':
        return this.deadLetterQueue;
      default:
        return null;
    }
  }
}
