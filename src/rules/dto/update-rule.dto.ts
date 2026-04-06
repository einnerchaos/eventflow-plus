import { IsString, IsOptional, IsNumber, IsObject, IsBoolean, IsArray, IsUUID, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActionType } from '@prisma/client';

export class UpdateRuleDto {
  @ApiPropertyOptional({
    example: 'High Value Payment Alert',
    description: 'Rule name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Trigger alert when payment amount exceeds threshold',
    description: 'Rule description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'payment.failed',
    description: 'Event type this rule applies to',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  eventType?: string;

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
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({
    example: {
      all: [
        {
          field: 'payload.amount',
          operator: '>',
          value: 1000,
        },
      ],
    },
    description: 'Condition structure with AND/OR logic',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    example: [
      {
        type: ActionType.CALL_WEBHOOK,
        config: {
          url: 'https://api.example.com/webhook/payments',
          method: 'POST',
        },
      },
    ],
    description: 'Actions to execute when rule matches',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  actions?: Array<{
    type: ActionType;
    config: Record<string, any>;
  }>;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether rule is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
