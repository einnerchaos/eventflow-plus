import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventProcessingService } from '../services/event-processing.service';

interface ProcessEventJob {
  eventId: string;
}

@Processor('event-processing', {
  concurrency: 5,
})
export class EventConsumer extends WorkerHost {
  private readonly logger = new Logger(EventConsumer.name);

  constructor(private readonly eventProcessing: EventProcessingService) {
    super();
  }

  async process(job: Job<ProcessEventJob>): Promise<void> {
    const { eventId } = job.data;

    this.logger.log(`Processing job ${job.id}: event ${eventId}`);

    try {
      await this.eventProcessing.processEvent(eventId);
      this.logger.log(`Job ${job.id} completed: event ${eventId} processed`);
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      throw error; // Re-throw to trigger BullMQ retry
    }
  }
}
