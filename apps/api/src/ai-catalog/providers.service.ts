import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type {
  createProviderSchema,
  updateProviderSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // Credentials live in the environment (loaded by the SDK integration
    // module), never in the database — so providers expose only catalog data.
    return this.prisma.aiProvider.findMany({
      include: {
        _count: { select: { models: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: z.infer<typeof createProviderSchema>) {
    return this.prisma.aiProvider.create({ data: dto });
  }

  async update(id: string, dto: z.infer<typeof updateProviderSchema>) {
    return this.prisma.aiProvider.update({ where: { id }, data: dto });
  }
}
