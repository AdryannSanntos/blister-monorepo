import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import {
  companyScopePrefix,
  isKeyInPendingScope,
} from '../storage/storage-path.util';
import type { z } from 'zod';
import type {
  updateCompanyBodySchema,
  onboardingBodySchema,
} from './dto/company.dto';
import { createCompanyForUser } from './company-bootstrap.util';
import { getActiveCompanyIdFromRequest } from './company-context.util';

export type HomeDestination = 'onboarding' | 'dashboard' | 'workspaces';

export type CompanySummary = {
  id: string;
  name: string;
  slug: string;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  listByOwner(ownerUserId: string): Promise<CompanySummary[]> {
    return this.prisma.company.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findIncompleteByOwner(ownerUserId: string) {
    return this.prisma.company.findFirst({
      where: { ownerUserId, onboardingCompletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getHomeDestination(ownerUserId: string): Promise<HomeDestination> {
    const companies = await this.listByOwner(ownerUserId);
    const incomplete = companies.filter((company) => !company.onboardingCompletedAt);

    if (companies.length === 0 || incomplete.length > 0) {
      return 'onboarding';
    }

    const onboarded = companies.filter((company) => company.onboardingCompletedAt);
    if (onboarded.length === 1) {
      return 'dashboard';
    }

    return 'workspaces';
  }

  async resolveActiveCompany(ownerUserId: string, activeCompanyId?: string) {
    const companies = await this.listByOwner(ownerUserId);
    if (companies.length === 0) {
      throw new NotFoundException('Company not found');
    }

    if (activeCompanyId) {
      const selected = companies.find((company) => company.id === activeCompanyId);
      if (!selected) {
        throw new BadRequestException('Invalid active company');
      }
      if (!selected.onboardingCompletedAt) {
        throw new BadRequestException('Company onboarding is incomplete');
      }
      return selected;
    }

    const onboarded = companies.filter((company) => company.onboardingCompletedAt);
    if (onboarded.length === 1) {
      return onboarded[0];
    }

    throw new BadRequestException('Select an active company');
  }

  resolveActiveCompanyFromRequest(ownerUserId: string, req: Request) {
    return this.resolveActiveCompany(
      ownerUserId,
      getActiveCompanyIdFromRequest(req),
    );
  }

  async findByOwnerOrThrow(ownerUserId: string, req?: Request) {
    if (req) {
      return this.resolveActiveCompanyFromRequest(ownerUserId, req);
    }

    const companies = await this.listByOwner(ownerUserId);
    const onboarded = companies.filter((company) => company.onboardingCompletedAt);
    if (onboarded.length === 1) {
      return onboarded[0];
    }
    if (onboarded.length === 0) {
      throw new NotFoundException('Company not found');
    }
    throw new BadRequestException('Select an active company');
  }

  async getOnboardingStatus(ownerUserId: string) {
    const destination = await this.getHomeDestination(ownerUserId);
    return { completed: destination !== 'onboarding' };
  }

  async updateName(
    ownerUserId: string,
    dto: z.infer<typeof updateCompanyBodySchema>,
    req: Request,
  ) {
    const company = await this.resolveActiveCompanyFromRequest(ownerUserId, req);
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: { name: dto.name },
    });
    await this.audit.write({
      actorUserId: ownerUserId,
      action: 'company.update',
      resourceType: 'Company',
      resourceId: company.id,
      metadata: { name: dto.name },
    });
    return updated;
  }

  async completeOnboarding(
    ownerUserId: string,
    dto: z.infer<typeof onboardingBodySchema>,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
    if (!user) throw new NotFoundException('User not found');

    const incomplete = dto.createNew
      ? null
      : await this.findIncompleteByOwner(ownerUserId);
    const company =
      incomplete ??
      (await createCompanyForUser(this.prisma, user, dto.companyName));

    const resolvedLogo = await this.resolveLogoStorageKey(
      ownerUserId,
      company.slug,
      dto.logoStorageKey,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: company.id },
        data: {
          name: dto.companyName,
          onboardingCompletedAt: new Date(),
        },
      });

      const existing = await tx.brandProfile.findUnique({
        where: { companyId: company.id },
      });

      const logoData = resolvedLogo.logoStorageKey
        ? {
            logoStorageKey: resolvedLogo.logoStorageKey,
            logoVariants: resolvedLogo.logoVariants,
          }
        : {};

      if (existing) {
        await tx.brandProfile.update({
          where: { companyId: company.id },
          data: {
            brandVoice: dto.brandVoice,
            niche: dto.niche,
            description: dto.description,
            ...logoData,
          },
        });
      } else {
        await tx.brandProfile.create({
          data: {
            companyId: company.id,
            brandVoice: dto.brandVoice,
            niche: dto.niche,
            description: dto.description,
            logoStorageKey: resolvedLogo.logoStorageKey,
            logoVariants: resolvedLogo.logoVariants,
          },
        });
      }
    });

    await this.audit.write({
      actorUserId: ownerUserId,
      action: 'company.onboarding_completed',
      resourceType: 'Company',
      resourceId: company.id,
    });

    return this.prisma.company.findUniqueOrThrow({
      where: { id: company.id },
    });
  }

  async deleteCompany(
    ownerUserId: string,
    confirmName: string,
    req: Request,
  ) {
    const activeCompany = await this.resolveActiveCompanyFromRequest(
      ownerUserId,
      req,
    );
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: activeCompany.id },
    });

    if (company.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('Apenas o proprietário pode excluir a empresa');
    }

    if (company.name.trim() !== confirmName.trim()) {
      throw new BadRequestException(
        'O nome digitado não corresponde ao nome da empresa',
      );
    }

    await this.prisma.company.delete({ where: { id: company.id } });

    await this.audit.write({
      actorUserId: ownerUserId,
      action: 'company.delete',
      resourceType: 'Company',
      resourceId: company.id,
      metadata: { name: company.name, slug: company.slug },
    });

    return { success: true };
  }

  private async resolveLogoStorageKey(
    ownerUserId: string,
    companySlug: string,
    logoStorageKey?: string,
  ) {
    if (!logoStorageKey?.trim()) {
      return {
        logoStorageKey: null as string | null,
        logoVariants: {} as Record<string, string>,
      };
    }

    let resolvedKey = logoStorageKey.trim();

    if (isKeyInPendingScope(resolvedKey, ownerUserId)) {
      const filename = resolvedKey.split('/').pop() ?? `logo-${Date.now()}`;
      const destinationKey = `${companyScopePrefix(companySlug)}logos/primary/${filename}`;
      await this.storage.copyObject(resolvedKey, destinationKey);
      resolvedKey = destinationKey;
    }

    return {
      logoStorageKey: resolvedKey,
      logoVariants: { primary: resolvedKey },
    };
  }
}
