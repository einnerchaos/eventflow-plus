import { IsString, IsOptional, IsObject, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitEventDto {
  @ApiProperty({
    example: 'payment.failed',
    description: 'Event type identifier',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  eventType: string;

  @ApiProperty({
    example: 'payment-12345-retry-3',
    description: 'Unique correlation ID for idempotency. If provided and already seen, event will be deduplicated.',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  correlationId?: string;

  @ApiProperty({
    example: {
      orderId: 'order-987',
      amount: 99.99,
      currency: 'USD',
      customerId: 'cust-123',
      retryCount: 3,
      reason: 'insufficient_funds',
    },
    description: 'Event payload as JSON object',
    type: 'object',
  })
  @IsObject()
  payload: Record<string, any>;
}
