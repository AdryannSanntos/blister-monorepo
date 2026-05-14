import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { publishOnboardingSchema, upsertOnboardingDraftSchema } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('organizations/:orgId/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  async getDraft(@Param('orgId') orgId: string) {
    const draft = await this.onboardingService.getDraft(orgId);
    return draft ?? { currentStep: 0, data: {}, publishedAt: null };
  }

  @Put()
  async upsertDraft(@Param('orgId') orgId: string, @Body() body: unknown) {
    const parsed = upsertOnboardingDraftSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.onboardingService.upsertDraft(orgId, parsed.data);
  }

  @Post('publish')
  async publish(@Param('orgId') orgId: string, @Body() body: unknown) {
    const parsed = publishOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.onboardingService.publish(orgId, parsed.data.userId);
  }

  @Get('status')
  async getStatus(@Param('orgId') orgId: string) {
    const published = await this.onboardingService.isPublished(orgId);
    return { published };
  }
}
