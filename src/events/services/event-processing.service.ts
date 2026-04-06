import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/database/prisma.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { Event, EventStatus, AutomationRule, ActionType } from '@prisma/client';
import { RuleEngineService } from '../../rules/services/rule-engine.service';

@Injectable()
export class EventProcessingService {
  private readonly logger = new Logger(EventProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly ruleEngine: RuleEngineService,
    @InjectQueue('action-execution') private readonly actionQueue: Queue,
  ) {}

  /**
   * Process an event: evaluate rules and queue actions
   */
  async processEvent(eventId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Fetch event
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { source: true },
      });

      if (!event) {
        this.logger.error(`Event not found: ${eventId}`);
        return;
      }

      if (event.isDuplicate) {
        this.logger.log(`Skipping duplicate event: ${eventId}`);
        return;
      }

      this.logger.log(`Processing event: ${eventId}, type=${event.eventType}`);

      // 2. Find matching rules
      const matchingRules = await this.findMatchingRules(event);

      // 3. Record rule evaluation metrics
      this.metrics.rulesEvaluated.inc({ matched: matchingRules.length > 0 ? 'true' : 'false' });

      // 4. Update event with matched rules count
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: matchingRules.length > 0 ? EventStatus.MATCHED : EventStatus.NO_MATCH,
          matchedRules: matchingRules.length,
          processedAt: new Date(),
        },
      });

      // 5. Queue actions for matched rules
      for (const rule of matchingRules) {
        await this.queueRuleActions(event, rule);
      }

      // 6. Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ruleEvaluationDuration.observe(duration);

      this.logger.log(
        `Event ${eventId} processed: ${matchingRules.length} rules matched, actions queued`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process event ${eventId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );

      // Update event to error status
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.ERROR },
      });

      throw error;
    }
  }

  /**
   * Find rules that match this event
   */
  private async findMatchingRules(event: Event & { source: { id: string; name: string } }): Promise<AutomationRule[]> {
    // 1. Get all active rules for this event type
    const rules = await this.prisma.automationRule.findMany({
      where: {
        eventType: event.eventType,
        isActive: true,
        OR: [
          { sourceId: null }, // Global rules (any source)
          { sourceId: event.sourceId }, // Source-specific rules
        ],
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'asc' }, // Then by creation date
      ],
    });

    // 2. Evaluate conditions for each rule
    const matchingRules: AutomationRule[] = [];

    for (const rule of rules) {
      try {
        const matches = await this.ruleEngine.evaluateConditions(
          rule.conditions as any,
          event.payload as Record<string, any>,
        );

        if (matches) {
          matchingRules.push(rule);
          this.logger.debug(`Rule ${rule.id} matched for event ${event.id}`);
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
        // Continue with other rules - don't let one bad rule break everything
      }
    }

    return matchingRules;
  }

  /**
   * Queue all actions for a matched rule
   */
  private async queueRuleActions(event: Event, rule: AutomationRule): Promise<void> {
    const actions = rule.actions as Array<{
      type: ActionType;
      config: Record<string, any>;
    }>;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (!action.type) {
        this.logger.error(`Action at index ${i} is missing 'type' field. Action:`, JSON.stringify(action));
        continue;
      }

      // Create execution record
      const execution = await this.prisma.actionExecution.create({
        data: {
          eventId: event.id,
          ruleId: rule.id,
          actionIndex: i,
          actionType: action.type,
          actionConfig: action.config as any,
          status: 'PENDING',
          attemptCount: 0,
          maxAttempts: 3,
        },
      });

      // Add to queue
      await this.actionQueue.add(
        'execute-action',
        {
          executionId: execution.id,
          eventId: event.id,
          ruleId: rule.id,
          actionType: action.type,
          actionConfig: action.config,
          attemptCount: 0,
        },
        {
          jobId: `action-${execution.id}`,
          delay: 0,
          priority: rule.priority,
        },
      );

      this.metrics.executionsCreated.inc({ action_type: action.type });

      this.logger.log(
        `Action queued: execution=${execution.id}, type=${action.type}, rule=${rule.name}`,
      );
    }

    // Update rule stats
    await this.prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  }
}
