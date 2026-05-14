import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma';
import { MembershipService } from '../organization/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertOnboardingDraftDto } from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipService,
  ) {}

  async getDraft(organizationId: string) {
    return this.prisma.onboardingDraft.findUnique({
      where: { organizationId },
    });
  }

  async upsertDraft(organizationId: string, dto: UpsertOnboardingDraftDto) {
    return this.prisma.onboardingDraft.upsert({
      where: { organizationId },
      create: {
        organizationId,
        currentStep: dto.currentStep,
        data: dto.data as Prisma.InputJsonValue,
      },
      update: {
        currentStep: dto.currentStep,
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  async publish(organizationId: string, userId: string) {
    const draft = await this.prisma.onboardingDraft.findUnique({
      where: { organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }

    if (draft.publishedAt) {
      throw new ForbiddenException('Onboarding already published');
    }

    const ability = await this.membershipService.getEffectiveAbility(organizationId, userId);

    if (!ability.can('update', 'Onboarding')) {
      throw new ForbiddenException('Only the owner can publish the onboarding');
    }

    return this.prisma.onboardingDraft.update({
      where: { organizationId },
      data: { publishedAt: new Date() },
    });
  }

  async isPublished(organizationId: string): Promise<boolean> {
    const draft = await this.prisma.onboardingDraft.findUnique({
      where: { organizationId },
      select: { publishedAt: true },
    });

    return draft?.publishedAt != null;
  }
}
