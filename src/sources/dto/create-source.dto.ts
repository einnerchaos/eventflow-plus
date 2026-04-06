import { IsString, IsOptional, IsObject, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSourceDto {
  @ApiProperty({ example: 'Payment Gateway' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Handles all payment-related events' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
