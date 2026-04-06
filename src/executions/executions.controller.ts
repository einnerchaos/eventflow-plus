import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, AdminOnly } from '../auth/decorators/roles.decorator';
import { QueryExecutionsDto } from './dto/query-executions.dto';

@ApiTags('Executions')
@Controller('executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({ summary: 'List action executions' })
  async listExecutions(@Query() query: QueryExecutionsDto) {
    return this.executionsService.listExecutions(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiOperation({ summary: 'Get execution details' })
  async getExecution(@Param('id') id: string) {
    const execution = await this.executionsService.getExecution(id);
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }
    return execution;
  }

  @Post(':id/retry')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiOperation({ summary: 'Manually retry failed execution' })
  async retryExecution(@Param('id') id: string) {
    return this.executionsService.retryExecution(id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get execution statistics' })
  async getStats() {
    return this.executionsService.getStats();
  }
}
