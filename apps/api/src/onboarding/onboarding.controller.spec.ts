import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

const makeMockOnboardingService = () => ({
  getDraft: jest.fn(),
  upsertDraft: jest.fn(),
  publish: jest.fn(),
  isPublished: jest.fn(),
});

describe('OnboardingController', () => {
  let controller: OnboardingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: makeMockOnboardingService() }],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it('rejects publish without userId', async () => {
    await expect(controller.publish('org-1', {} as { userId: string })).rejects.toThrow(
      BadRequestException,
    );
  });
});
