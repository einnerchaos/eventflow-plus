import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { ActionExecutionWorker } from './action-execution.worker';
import { RetryWorker } from './retry.worker';
import { WorkersService } from './workers.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'action-execution' },
      { name: 'retry-queue' },
      { name: 'dead-letter' },
    ),
    WebhooksModule,
    ExecutionsModule,
  ],
  providers: [ActionExecutionWorker, RetryWorker, WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
