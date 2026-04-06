import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established successfully');
    } catch (error) {
      this.logger.error(
        '❌ Failed to connect to database',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Database connection closed');
  }

  /**
   * Execute a transaction with proper error handling
   */
  async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (prisma) => {
      try {
        return await fn(prisma as PrismaClient);
      } catch (error) {
        this.logger.error(
          'Transaction failed',
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }

  /**
   * Clean specific tables (useful for testing)
   */
  async cleanDatabase(tables: string[] = []) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const tablesToClean = tables.length > 0 
      ? tables 
      : [
          'webhook_deliveries',
          'failed_executions',
          'action_executions',
          'audit_logs',
          'events',
          'automation_rules',
          'app_sources',
          'refresh_tokens',
          'users',
          'daily_metrics',
        ];

    for (const table of tablesToClean) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
