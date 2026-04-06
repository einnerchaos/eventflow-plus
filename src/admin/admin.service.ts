import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  async getDashboardStats() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      recentEvents,
      totalRules,
      activeRules,
      totalExecutions,
      failedExecutions,
      deadLetterCount,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { receivedAt: { gte: last24Hours } } }),
      this.prisma.automationRule.count(),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.actionExecution.count(),
      this.prisma.actionExecution.count({ where: { status: { in: ['FAILED', 'PERMANENTLY_FAILED'] } } }),
      this.prisma.failedExecution.count({ where: { status: 'UNRESOLVED' } }),
    ]);

    return {
      events: { total: totalEvents, last24Hours: recentEvents },
      rules: { total: totalRules, active: activeRules },
      executions: { total: totalExecutions, failed: failedExecutions },
      deadLetter: { unresolved: deadLetterCount },
    };
  }

  async getSystemHealth() {
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
    ]);

    return {
      healthy: dbHealth.healthy && redisHealth.healthy,
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: -1 };
    }
  }

  private async checkRedisHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: -1 };
    }
  }
}
