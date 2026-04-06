import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, AdminOnly } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @AdminOnly()
  @ApiOperation({ summary: 'Get queue statistics' })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Get('jobs')
  @AdminOnly()
  @ApiQuery({ name: 'queue', enum: ['action-execution', 'retry-queue', 'dead-letter'] })
  @ApiQuery({ name: 'status', enum: ['waiting', 'active', 'completed', 'failed', 'delayed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'List queue jobs' })
  async getJobs(
    @Query('queue') queue: string,
    @Query('status') status: string,
    @Query('limit') limit: number = 20,
  ) {
    return this.queueService.getQueueJobs(queue, status, limit);
  }
}
