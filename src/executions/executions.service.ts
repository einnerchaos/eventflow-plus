import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { QueryExecutionsDto } from './dto/query-executions.dto';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listExecutions(query: QueryExecutionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.eventId) where.eventId = query.eventId;
    if (query.ruleId) where.ruleId = query.ruleId;
    if (query.actionType) where.actionType = query.actionType;

    const [data, total] = await Promise.all([
      this.prisma.actionExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rule: { select: { name: true } },
          failure: true,
        },
      }),
      this.prisma.actionExecution.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getExecution(id: string) {
    return this.prisma.actionExecution.findUnique({
      where: { id },
      include: {
        rule: true,
        event: true,
        failure: true,
        webhooks: true,
      },
    });
  }

  async retryExecution(id: string) {
    const execution = await this.prisma.actionExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    // Reset status and queue for retry
    await this.prisma.actionExecution.update({
      where: { id },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        errorMessage: undefined,
        errorCategory: undefined,
        errorDetails: undefined,
      },
    });

    this.logger.log(`Execution ${id} queued for manual retry`);
    return { message: 'Execution queued for retry' };
  }

  async getStats() {
    const [
      total,
      byStatus,
      byActionType,
      recentFailures,
    ] = await Promise.all([
      this.prisma.actionExecution.count(),
      this.prisma.actionExecution.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.actionExecution.groupBy({
        by: ['actionType'],
        _count: { actionType: true },
      }),
      this.prisma.actionExecution.count({
        where: {
          status: { in: ['FAILED', 'PERMANENTLY_FAILED'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {} as Record<string, number>),
      byActionType: byActionType.reduce((acc, t) => {
        acc[t.actionType] = t._count.actionType;
        return acc;
      }, {} as Record<string, number>),
      recentFailures,
    };
  }
}
