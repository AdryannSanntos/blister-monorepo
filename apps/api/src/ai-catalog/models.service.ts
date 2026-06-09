import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type {
  createModelSchema,
  updateModelSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aiModel.findMany({
      include: {
        provider: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ providerId: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: z.infer<typeof createModelSchema>) {
    return this.prisma.aiModel.create({ data: dto });
  }

  async update(id: string, dto: z.infer<typeof updateModelSchema>) {
    return this.prisma.aiModel.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.prisma.aiModel.delete({ where: { id } });
  }
}
