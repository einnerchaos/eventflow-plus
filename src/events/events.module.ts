import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { IdempotencyService } from './services/idempotency.service';
import { EventProcessingService } from './services/event-processing.service';
import { RulesModule } from '../rules/rules.module';
import { QueueModule } from '../queue/queue.module';
import { EventConsumer } from './consumers/event.consumer';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'event-processing',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
      {
        name: 'action-execution',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
    ),
    RulesModule,
    QueueModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    IdempotencyService,
    EventProcessingService,
    EventConsumer,
  ],
  exports: [EventsService, IdempotencyService],
})
export class EventsModule {}
