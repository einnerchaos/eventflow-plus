import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { SubmitEventDto } from './dto/submit-event.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { Event } from '@prisma/client';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==========================================
  // EVENT INGESTION (API Key Auth)
  // ==========================================

  @UseGuards(ApiKeyGuard)
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit a new event',
    description: `Submit an event for processing. Requires X-API-Key header.
    
    **Idempotency:** If you provide a correlationId that has been seen before
    from the same source, the event will be marked as duplicate and not processed again.`,
  })
  @ApiBody({ type: SubmitEventDto })
  @ApiResponse({
    status: 202,
    description: 'Event accepted for processing',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async submitEvent(
    @Body() submitEventDto: SubmitEventDto,
    @Request() req: Request & { sourceId: string },
  ): Promise<EventResponseDto> {
    const result = await this.eventsService.submitEvent({
      sourceId: req.sourceId,
      eventType: submitEventDto.eventType,
      correlationId: submitEventDto.correlationId,
      payload: submitEventDto.payload,
    });

    return {
      id: result.event.id,
      status: result.event.status,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate
        ? 'Event is a duplicate, using existing record'
        : 'Event accepted for processing',
      receivedAt: result.event.receivedAt,
    };
  }

  // ==========================================
  // EVENT RETRIEVAL (JWT Auth)
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List events',
    description: 'Query events with filters and pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sourceId', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'correlationId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'List of events' })
  async listEvents(
    @Query() query: QueryEventsDto,
  ): Promise<{ data: Event[]; total: number; page: number; limit: number }> {
    return this.eventsService.listEvents(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get event details',
    description: 'Get detailed information about a specific event including executions',
  })
  @ApiParam({ name: 'id', description: 'Event ID', type: String })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(
    @Param('id') id: string,
  ): Promise<Event & { executions: any[] }> {
    const event = await this.eventsService.getEventWithExecutions(id);

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    return event;
  }

  // ==========================================
  // ADMIN OPERATIONS
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/reprocess')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reprocess an event (Admin only)',
    description: 'Force re-evaluation of rules for an existing event',
  })
  @ApiParam({ name: 'id', description: 'Event ID', type: String })
  @ApiResponse({ status: 200, description: 'Event queued for reprocessing' })
  async reprocessEvent(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.eventsService.reprocessEvent(id, req.user.id);

    return { message: 'Event queued for reprocessing' };
  }

  // ==========================================
  // STATS
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get('stats/summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get event statistics',
    description: 'Get summary statistics about events',
  })
  @ApiResponse({ status: 200, description: 'Event statistics' })
  async getEventStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byType: Record<string, number>;
    duplicates: number;
    last24Hours: number;
  }> {
    return this.eventsService.getEventStats();
  }
}
