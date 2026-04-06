import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class EventResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique event ID',
  })
  id: string;

  @ApiProperty({
    enum: EventStatus,
    example: 'PROCESSING',
    description: 'Current event processing status',
  })
  status: EventStatus;

  @ApiProperty({
    example: false,
    description: 'Whether this event was detected as a duplicate',
  })
  isDuplicate: boolean;

  @ApiProperty({
    example: 'Event accepted for processing',
    description: 'Human-readable status message',
  })
  message: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the event was received',
  })
  receivedAt: Date;
}
