import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type {
  addCredentialSchema,
  createProviderSchema,
  updateProviderSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aiProvider.findMany({
      include: {
        credentials: {
          select: { id: true, label: true, isActive: true, createdAt: true },
        },
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

  async addCredential(
    providerId: string,
    dto: z.infer<typeof addCredentialSchema>,
  ) {
    return this.prisma.aiProviderCredential.create({
      data: {
        providerId,
        label: dto.label,
        // TODO: encrypt in production
        encryptedValue: dto.value,
      },
    });
  }

  async deleteCredential(credId: string) {
    return this.prisma.aiProviderCredential.delete({ where: { id: credId } });
  }
}
