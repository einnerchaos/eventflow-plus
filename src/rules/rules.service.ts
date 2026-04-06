import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { RuleEngineService } from './services/rule-engine.service';
import { AutomationRule, Prisma, ActionType } from '@prisma/client';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { QueryRulesDto } from './dto/query-rules.dto';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new automation rule
   */
  async createRule(dto: CreateRuleDto, createdBy: string): Promise<AutomationRule> {
    // Validate conditions
    try {
      this.ruleEngine.validateConditionStructure(dto.conditions);
    } catch (error) {
      throw new BadRequestException(
        `Invalid condition structure: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }

    // Validate actions
    this.validateActions(dto.actions);
    
    this.logger.debug(`Creating rule with actions: ${JSON.stringify(dto.actions)}`);

    // Create rule
    const rule = await this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        eventType: dto.eventType,
        sourceId: dto.sourceId,
        priority: dto.priority || 0,
        conditions: dto.conditions as any,
        conditionText: dto.conditionText || this.generateConditionText(dto.conditions),
        actions: dto.actions as any,
        isActive: dto.isActive !== false, // Default true
        createdBy,
      },
    });

    this.logger.log(`Rule created: ${rule.id}, name=${rule.name}`);
    return rule;
  }

  /**
   * Update an existing rule
   */
  async updateRule(
    id: string,
    dto: UpdateRuleDto,
    updatedBy: string,
  ): Promise<AutomationRule | null> {
    const existing = await this.prisma.automationRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Validate new conditions if provided
    if (dto.conditions) {
      try {
        this.ruleEngine.validateConditionStructure(dto.conditions);
      } catch (error) {
        throw new BadRequestException(
          `Invalid condition structure: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    // Validate new actions if provided
    if (dto.actions) {
      this.validateActions(dto.actions);
    }

    const updateData: Prisma.AutomationRuleUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.eventType && { eventType: dto.eventType }),
      ...(dto.sourceId !== undefined && { sourceId: dto.sourceId }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.conditions && {
        conditions: dto.conditions as any,
        conditionText: this.generateConditionText(dto.conditions),
      }),
      ...(dto.actions && { actions: dto.actions as any }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const rule = await this.prisma.automationRule.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Rule updated: ${rule.id}`);
    return rule;
  }

  /**
   * Soft delete a rule (with audit)
   */
  async deleteRule(id: string, deletedBy: string): Promise<void> {
    const existing = await this.prisma.automationRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Rule not found');
    }

    await this.prisma.automationRule.update({
      where: { id },
      data: { isActive: false },
    });

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE',
        entityType: 'rule',
        entityId: id,
        oldValue: existing as any,
      },
    });

    this.logger.log(`Rule deleted (soft): ${id}`);
  }

  /**
   * Get a single rule
   */
  async getRule(id: string): Promise<AutomationRule | null> {
    return this.prisma.automationRule.findUnique({
      where: { id },
    });
  }

  /**
   * List rules with filtering
   */
  async listRules(query: QueryRulesDto): Promise<{
    data: AutomationRule[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AutomationRuleWhereInput = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.sourceId) {
      where.sourceId = query.sourceId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.automationRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.automationRule.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Set rule active status
   */
  async setRuleActive(id: string, isActive: boolean, userId: string): Promise<void> {
    const rule = await this.prisma.automationRule.update({
      where: { id },
      data: { isActive },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'rule',
        entityId: id,
        newValue: { isActive },
      },
    });

    this.logger.log(`Rule ${id} ${isActive ? 'activated' : 'deactivated'}`);
  }

  // ==========================================
  // TESTING
  // ==========================================

  /**
   * Test a rule against sample payload
   */
  async testRule(
    ruleId: string,
    payload: Record<string, any>,
  ): Promise<{
    matches: boolean;
    matchedConditions: string[];
    failedConditions: string[];
    actions: any[];
  }> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    const matches = await this.ruleEngine.evaluateConditions(
      rule.conditions as any,
      payload,
      true, // Return details
    );

    // Get evaluation details
    const details = await this.ruleEngine.getEvaluationDetails(
      rule.conditions as any,
      payload,
    );

    return {
      matches: typeof matches === 'boolean' ? matches : matches.result,
      matchedConditions: details.matched,
      failedConditions: details.failed,
      actions: rule.actions as any[],
    };
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get execution stats for a rule
   */
  async getRuleStats(ruleId: string): Promise<{
    executionCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    lastExecutedAt: Date | null;
    last7Days: { date: string; count: number }[];
  }> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: {
        executionCount: true,
        successCount: true,
        failureCount: true,
        lastExecutedAt: true,
      },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    // Get last 7 days stats
    const last7Days = await this.getLast7DaysStats(ruleId);

    const successRate =
      rule.executionCount > 0
        ? (rule.successCount / rule.executionCount) * 100
        : 0;

    return {
      executionCount: rule.executionCount,
      successCount: rule.successCount,
      failureCount: rule.failureCount,
      successRate: Math.round(successRate * 100) / 100,
      lastExecutedAt: rule.lastExecutedAt,
      last7Days,
    };
  }

  /**
   * Get summary stats for all rules
   */
  async getRulesSummary(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byEventType: Record<string, number>;
    topExecuted: Array<{ id: string; name: string; count: number }>;
  }> {
    const [total, active, inactive, byEventType, topExecuted] = await Promise.all([
      this.prisma.automationRule.count(),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.automationRule.count({ where: { isActive: false } }),
      this.prisma.automationRule
        .groupBy({
          by: ['eventType'],
          _count: { eventType: true },
        })
        .then((results) =>
          results.reduce((acc, item) => {
            acc[item.eventType] = item._count.eventType;
            return acc;
          }, {} as Record<string, number>),
        ),
      this.prisma.automationRule.findMany({
        orderBy: { executionCount: 'desc' },
        take: 5,
        select: { id: true, name: true, executionCount: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byEventType,
      topExecuted: topExecuted.map((r) => ({
        id: r.id,
        name: r.name,
        count: r.executionCount,
      })),
    };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private validateActions(actions: Array<{ type: ActionType; config: any }>): void {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    const validTypes = Object.values(ActionType);

    for (const action of actions) {
      if (!validTypes.includes(action.type)) {
        throw new BadRequestException(`Invalid action type: ${action.type}`);
      }

      if (!action.config || typeof action.config !== 'object') {
        throw new BadRequestException(`Action ${action.type} missing config`);
      }
    }
  }

  private generateConditionText(conditions: any): string {
    // Generate human-readable description of conditions
    return this.ruleEngine.generateConditionDescription(conditions);
  }

  private async getLast7DaysStats(ruleId: string): Promise<{ date: string; count: number }[]> {
    const results = await this.prisma.actionExecution.groupBy({
      by: ['createdAt'],
      where: {
        ruleId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: { id: true },
    });

    // Group by date
    const grouped = new Map<string, number>();

    for (const result of results) {
      const date = result.createdAt.toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || 0) + result._count.id);
    }

    // Fill in missing dates
    const today = new Date();
    const last7Days: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push({ date: dateStr, count: grouped.get(dateStr) || 0 });
    }

    return last7Days;
  }
}
