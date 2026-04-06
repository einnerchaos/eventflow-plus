import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { RuleEngineService } from './services/rule-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, AdminOnly } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { TestRuleDto } from './dto/test-rule.dto';
import { QueryRulesDto } from './dto/query-rules.dto';
import { AutomationRule } from '@prisma/client';

@ApiTags('Rules')
@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  @Post()
  @AdminOnly()
  @ApiOperation({
    summary: 'Create automation rule (Admin only)',
    description: 'Create a new automation rule with conditions and actions',
  })
  @ApiBody({ type: CreateRuleDto })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rule configuration' })
  async createRule(
    @Body() createRuleDto: CreateRuleDto,
    @Request() req: RequestWithUser,
  ): Promise<AutomationRule> {
    return this.rulesService.createRule(createRuleDto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List automation rules',
    description: 'Get all automation rules with optional filtering',
  })
  async listRules(
    @Query() query: QueryRulesDto,
  ): Promise<{ data: AutomationRule[]; total: number; page: number; limit: number }> {
    return this.rulesService.listRules(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Get rule details',
    description: 'Get detailed information about a specific rule',
  })
  async getRule(@Param('id') id: string): Promise<AutomationRule> {
    const rule = await this.rulesService.getRule(id);
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }
    return rule;
  }

  @Patch(':id')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Update automation rule (Admin only)',
    description: 'Update an existing automation rule',
  })
  @ApiBody({ type: UpdateRuleDto })
  async updateRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateRuleDto,
    @Request() req: RequestWithUser,
  ): Promise<AutomationRule> {
    const rule = await this.rulesService.updateRule(id, updateRuleDto, req.user.id);
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }
    return rule;
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Delete automation rule (Admin only)',
    description: 'Delete an automation rule (soft delete with audit)',
  })
  async deleteRule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.rulesService.deleteRule(id, req.user.id);
  }

  // ==========================================
  // RULE MANAGEMENT
  // ==========================================

  @Post(':id/activate')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Activate rule (Admin only)',
    description: 'Enable an inactive automation rule',
  })
  async activateRule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.rulesService.setRuleActive(id, true, req.user.id);
    return { message: 'Rule activated successfully' };
  }

  @Post(':id/deactivate')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Deactivate rule (Admin only)',
    description: 'Disable an active automation rule',
  })
  async deactivateRule(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.rulesService.setRuleActive(id, false, req.user.id);
    return { message: 'Rule deactivated successfully' };
  }

  // ==========================================
  // TESTING
  // ==========================================

  @Post(':id/test')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Test rule against sample data',
    description: 'Test a rule without triggering actions',
  })
  @ApiBody({ type: TestRuleDto })
  @ApiResponse({ status: 200, description: 'Rule test result' })
  async testRule(
    @Param('id') id: string,
    @Body() testRuleDto: TestRuleDto,
  ): Promise<{
    matches: boolean;
    matchedConditions: string[];
    failedConditions: string[];
    actions: any[];
  }> {
    const result = await this.rulesService.testRule(id, testRuleDto.payload);
    return result;
  }

  @Post('test/validate-conditions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate condition syntax',
    description: 'Validate a condition structure without saving',
  })
  @ApiBody({ type: Object })
  async validateConditions(
    @Body() body: { conditions: any; payload?: Record<string, any> },
  ): Promise<{
    valid: boolean;
    errors?: string[];
    matches?: boolean;
  }> {
    try {
      // Validate structure
      this.ruleEngine.validateConditionStructure(body.conditions);

      // If payload provided, test evaluation
      let matches: boolean | undefined;
      if (body.payload) {
        const result = await this.ruleEngine.evaluateConditions(body.conditions, body.payload);
        matches = typeof result === 'boolean' ? result : result.result;
      }

      return {
        valid: true,
        matches,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid condition structure'],
      };
    }
  }

  // ==========================================
  // STATS
  // ==========================================

  @Get(':id/stats')
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiOperation({
    summary: 'Get rule execution statistics',
    description: 'Get execution stats for a specific rule',
  })
  async getRuleStats(@Param('id') id: string): Promise<{
    executionCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    lastExecutedAt: Date | null;
    last7Days: { date: string; count: number }[];
  }> {
    return this.rulesService.getRuleStats(id);
  }

  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get all rules statistics',
    description: 'Get summary statistics for all rules',
  })
  async getRulesSummary(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byEventType: Record<string, number>;
    topExecuted: Array<{ id: string; name: string; count: number }>;
  }> {
    return this.rulesService.getRulesSummary();
  }
}
