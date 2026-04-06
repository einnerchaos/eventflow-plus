import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestRuleDto {
  @ApiProperty({
    example: {
      amount: 1500,
      currency: 'USD',
      customerId: 'cust-123',
    },
    description: 'Sample payload to test the rule against',
    type: 'object',
  })
  @IsObject()
  payload: Record<string, any>;
}
