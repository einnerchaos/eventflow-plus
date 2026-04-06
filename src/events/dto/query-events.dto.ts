import { IsString, IsOptional, IsInt, IsDate, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class QueryEventsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'source-123',
    description: 'Filter by source ID',
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({
    example: 'payment.failed',
    description: 'Filter by event type',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    enum: EventStatus,
    example: 'MATCHED',
    description: 'Filter by event status',
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    example: 'payment-12345',
    description: 'Filter by correlation ID',
  })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00Z',
    description: 'Filter events from this date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({
    example: '2024-01-31T23:59:59Z',
    description: 'Filter events up to this date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}
