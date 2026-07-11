import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { CreditService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  adjustCompanyCreditSchema,
  platformCompaniesQuerySchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PlatformCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  async findAll(query: z.infer<typeof platformCompaniesQuerySchema>) {
    const skip = (query.page - 1) * query.pageSize;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          creditBalance: true,
          owner: { select: { email: true } },
        },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        ownerEmail: c.owner.email,
        creditBalance: c.creditBalance?.amount?.toString() ?? null,
        onboardingCompletedAt: c.onboardingCompletedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id },
      include: {
        creditBalance: true,
        owner: { select: { id: true, email: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            role: { select: { name: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      ownerId: company.owner.id,
      ownerEmail: company.owner.email,
      ownerName: company.owner.name,
      creditBalance: company.creditBalance?.amount?.toString() ?? null,
      onboardingCompletedAt: company.onboardingCompletedAt?.toISOString() ?? null,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      members: company.members.map((member) => ({
        id: member.id,
        userId: member.user.id,
        userName: member.user.name,
        userEmail: member.user.email,
        roleKey: member.role.name,
        roleName: member.role.name,
        joinedAt: member.joinedAt.toISOString(),
      })),
    };
  }

  async adjustCredits(
    companyId: string,
    adminUserId: string,
    dto: z.infer<typeof adjustCompanyCreditSchema>,
  ) {
    return this.creditService.adjust(
      companyId,
      dto.amount,
      dto.type,
      adminUserId,
      dto.reason,
    );
  }
}
