import { IsString, IsOptional, IsNumber, IsObject, IsBoolean, IsArray, IsEnum, IsUUID, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActionType } from '@prisma/client';

export class CreateRuleDto {
  @ApiProperty({
    example: 'High Value Payment Alert',
    description: 'Rule name',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Trigger alert when payment amount exceeds threshold',
    description: 'Rule description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 'payment.failed',
    description: 'Event type this rule applies to',
  })
  @IsString()
  @MinLength(1)
  eventType: string;

  @ApiPropertyOptional({
    example: 'source-123-uuid',
    description: 'Specific source to apply this rule to (null = all sources)',
  })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Rule priority (higher = processed first)',
    default: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number = 0;

  @ApiProperty({
    example: {
      all: [
        {
          field: 'payload.amount',
          operator: '>',
          value: 1000,
        },
        {
          any: [
            { field: 'payload.currency', operator: '==', value: 'USD' },
            { field: 'payload.currency', operator: '==', value: 'EUR' },
          ],
        },
      ],
    },
    description: 'Condition structure with AND/OR logic',
    type: 'object',
  })
  @IsObject()
  conditions: Record<string, any>;

  @ApiPropertyOptional({
    example: 'payload.amount > 1000 AND (payload.currency == USD OR payload.currency == EUR)',
    description: 'Human-readable condition description (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  conditionText?: string;

  @ApiProperty({
    example: [
      {
        type: ActionType.CALL_WEBHOOK,
        config: {
          url: 'https://api.example.com/webhook/payments',
          method: 'POST',
        },
      },
      {
        type: ActionType.SEND_EMAIL,
        config: {
          to: 'finance@example.com',
          subject: 'High Value Payment Alert',
        },
      },
    ],
    description: 'Actions to execute when rule matches',
    type: 'array',
  })
  @IsArray()
  @Type(() => Object)
  actions: Array<{
    type: ActionType;
    config: Record<string, any>;
  }>;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether rule is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
