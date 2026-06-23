import { Prisma } from '@company-os/db';
import { getTestPrisma } from './test-database';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export interface TestCompany {
  id: string;
  name: string;
  slug: string;
  userId: string;
  brandProfileId: string;
  creditBalance: number;
}

export interface TestSeedResult {
  company: TestCompany;
  user: {
    id: string;
    email: string;
    password: string;
  };
  platformSettings: {
    freeTierAmount: number;
    markupDefault: number;
    minRunCost: number;
  };
  providers: {
    assemblyaiId: string;
    geminiId: string;
  };
  models: {
    cutsDefaultModelId: string;
    embeddingModelId: string;
    cutsTranscriberModelId: string;
  };
}

const TEST_USER = {
  email: 'test@blister.test',
  password: 'TestPassword123!',
  name: 'Test Business User',
};

const TEST_COMPANY = {
  name: 'Test Business',
  slug: 'test-business',
};

export async function seedTestDatabase(): Promise<TestSeedResult> {
  const prisma = await getTestPrisma();

  const hashedPassword = hashPassword(TEST_USER.password);

  const user = await prisma.user.create({
    data: {
      id: `test_user_${Date.now()}`,
      name: TEST_USER.name,
      email: TEST_USER.email,
      emailVerified: true,
      userType: 'BUSINESS',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      id: `test_account_${Date.now()}`,
      userId: user.id,
      providerId: 'credential',
      accountId: TEST_USER.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } });
  if (ownerRole) {
    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: ownerRole.id,
      },
    });
  }

  const company = await prisma.company.create({
    data: {
      id: `test_company_${Date.now()}`,
      name: TEST_COMPANY.name,
      slug: TEST_COMPANY.slug,
      ownerUserId: user.id,
      onboardingCompletedAt: new Date(),
    },
  });

  const platformSettings = await prisma.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });

  const freeTierAmount = platformSettings?.freeTierAmount
    ? Number(platformSettings.freeTierAmount)
    : 20;

  const creditBalance = await prisma.creditBalance.create({
    data: {
      companyId: company.id,
      amount: new Prisma.Decimal(freeTierAmount),
      currency: 'USD',
    },
  });

  await prisma.creditLedger.create({
    data: {
      companyId: company.id,
      type: 'CREDIT',
      amount: new Prisma.Decimal(freeTierAmount),
      balanceAfter: new Prisma.Decimal(freeTierAmount),
      description: 'Test free tier credit',
    },
  });

  const brandProfile = await prisma.brandProfile.create({
    data: {
      id: `test_brand_${Date.now()}`,
      companyId: company.id,
      brandVoice:
        'Friendly and professional tone. We speak directly to small business owners.',
      niche: 'Marketing Digital',
      description: 'Test business for automated testing',
      targetAudience: 'Small business owners in Brazil',
      marketingObjective: 'STRENGTHEN_BRAND',
    },
  });

  const assemblyaiProvider = await prisma.aiProvider.findUnique({
    where: { slug: 'assemblyai' },
  });
  const assemblyaiSttProvider = await prisma.aiProvider.findUnique({
    where: { slug: 'assemblyai-stt' },
  });
  const geminiProvider = await prisma.aiProvider.findUnique({
    where: { slug: 'gemini' },
  });

  const cutsDefaultModel = assemblyaiProvider
    ? await prisma.aiModel.findFirst({
        where: {
          providerId: assemblyaiProvider.id,
          externalId: 'gemini-2.5-flash-lite',
        },
      })
    : null;

  const cutsTranscriberModel = assemblyaiSttProvider
    ? await prisma.aiModel.findFirst({
        where: {
          providerId: assemblyaiSttProvider.id,
          externalId: 'universal-2',
        },
      })
    : null;

  const embeddingModel = geminiProvider
    ? await prisma.aiModel.findFirst({
        where: {
          providerId: geminiProvider.id,
          externalId: 'gemini-embedding-001',
        },
      })
    : null;

  return {
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      userId: user.id,
      brandProfileId: brandProfile.id,
      creditBalance: freeTierAmount,
    },
    user: {
      id: user.id,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
    platformSettings: {
      freeTierAmount,
      markupDefault: platformSettings?.markupDefault
        ? Number(platformSettings.markupDefault)
        : 1.2,
      minRunCost: platformSettings?.minRunCost
        ? Number(platformSettings.minRunCost)
        : 0.01,
    },
    providers: {
      assemblyaiId: assemblyaiProvider?.id ?? '',
      geminiId: geminiProvider?.id ?? '',
    },
    models: {
      cutsDefaultModelId: cutsDefaultModel?.id ?? '',
      embeddingModelId: embeddingModel?.id ?? '',
      cutsTranscriberModelId: cutsTranscriberModel?.id ?? '',
    },
  };
}

export async function seedCompanyWithLowBalance(
  creditAmount: number,
): Promise<TestCompany> {
  const prisma = await getTestPrisma();

  const user = await prisma.user.create({
    data: {
      id: `test_low_credit_user_${Date.now()}`,
      name: 'Low Credit User',
      email: `lowcredit_${Date.now()}@blister.test`,
      emailVerified: true,
      userType: 'BUSINESS',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const company = await prisma.company.create({
    data: {
      id: `test_low_credit_company_${Date.now()}`,
      name: 'Low Credit Company',
      slug: `low-credit-${Date.now()}`,
      ownerUserId: user.id,
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.creditBalance.create({
    data: {
      companyId: company.id,
      amount: new Prisma.Decimal(creditAmount),
      currency: 'USD',
    },
  });

  const brandProfile = await prisma.brandProfile.create({
    data: {
      id: `test_low_credit_brand_${Date.now()}`,
      companyId: company.id,
      brandVoice: 'Test brand voice',
      niche: 'Testing',
    },
  });

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    userId: user.id,
    brandProfileId: brandProfile.id,
    creditBalance: creditAmount,
  };
}
