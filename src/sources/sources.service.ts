import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/database/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { QuerySourcesDto } from './dto/query-sources.dto';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSource(dto: CreateSourceDto, userId: string) {
    // Generate API key
    const apiKey = this.generateApiKey();
    const salt = await bcrypt.genSalt(10);
    const hashedKey = await bcrypt.hash(apiKey, salt);

    const source = await this.prisma.appSource.create({
      data: {
        name: dto.name,
        description: dto.description,
        apiKey: hashedKey,
        apiKeySalt: salt,
        isActive: true,
        createdBy: userId,
        metadata: dto.metadata || {},
      },
    });

    this.logger.log(`Source created: ${source.id} - ${source.name}`);

    // Return source with the plaintext API key (only shown once)
    return {
      ...source,
      apiKey, // Only time this is shown
      apiKeySalt: undefined, // Hide salt
    };
  }

  async listSources(query: QuerySourcesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.appSource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { events: true } },
        },
      }),
      this.prisma.appSource.count({ where }),
    ]);

    // Remove sensitive data
    const sanitizedData = data.map((source) => ({
      ...source,
      apiKey: undefined,
      apiKeySalt: undefined,
      eventCount: source._count.events,
      _count: undefined,
    }));

    return { data: sanitizedData, total, page, limit };
  }

  async getSource(id: string) {
    const source = await this.prisma.appSource.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true } },
        events: {
          orderBy: { receivedAt: 'desc' },
          take: 5,
          select: { id: true, eventType: true, status: true, receivedAt: true },
        },
      },
    });

    if (!source) return null;

    return {
      ...source,
      apiKey: undefined,
      apiKeySalt: undefined,
      eventCount: source._count.events,
      _count: undefined,
    };
  }

  async regenerateApiKey(id: string, userId: string) {
    const source = await this.prisma.appSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Source not found');

    // Generate new API key
    const apiKey = this.generateApiKey();
    const salt = await bcrypt.genSalt(10);
    const hashedKey = await bcrypt.hash(apiKey, salt);

    await this.prisma.appSource.update({
      where: { id },
      data: {
        apiKey: hashedKey,
        apiKeySalt: salt,
      },
    });

    this.logger.log(`API key regenerated for source: ${id} by user: ${userId}`);

    return {
      sourceId: id,
      apiKey, // Only time this is shown
      message: 'API key regenerated successfully. Save this key as it will not be shown again.',
    };
  }

  async updateSource(id: string, dto: UpdateSourceDto, userId: string) {
    const source = await this.prisma.appSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Source not found');

    const updated = await this.prisma.appSource.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
    });

    this.logger.log(`Source updated: ${id} by user: ${userId}`);

    return {
      ...updated,
      apiKey: undefined,
      apiKeySalt: undefined,
    };
  }

  async deleteSource(id: string, userId: string) {
    const source = await this.prisma.appSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Source not found');

    await this.prisma.appSource.delete({ where: { id } });

    this.logger.log(`Source deleted: ${id} by user: ${userId}`);
  }

  async setActive(id: string, isActive: boolean, userId: string) {
    const source = await this.prisma.appSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Source not found');

    await this.prisma.appSource.update({
      where: { id },
      data: { isActive },
    });

    this.logger.log(`Source ${id} ${isActive ? 'activated' : 'deactivated'} by user: ${userId}`);
  }

  private generateApiKey(): string {
    const prefix = 'ef';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}_${timestamp}`;
  }
}
