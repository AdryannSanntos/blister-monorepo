import { CompanyService } from './company.service';

type FakeCompany = { onboardingCompletedAt: Date | null };

const makeService = (companies: FakeCompany[]) => {
  const rows = companies.map((company, index) => ({
    id: `c${index}`,
    name: `Company ${index}`,
    slug: `company-${index}`,
    onboardingCompletedAt: company.onboardingCompletedAt,
    createdAt: new Date(index + 1),
    updatedAt: new Date(index + 1),
  }));

  const prisma = {
    company: { findMany: jest.fn().mockResolvedValue(rows) },
    companyMember: { findMany: jest.fn().mockResolvedValue([]) },
  } as never;

  return new CompanyService(prisma, {} as never, {} as never);
};

describe('CompanyService.getHomeDestination', () => {
  it('lands a brand-new user (no company) in the personal space', async () => {
    const service = makeService([]);
    await expect(service.getHomeDestination('u1')).resolves.toBe('personal-space');
  });

  it('stays in the personal space when no company is onboarded yet', async () => {
    const service = makeService([{ onboardingCompletedAt: null }]);
    await expect(service.getHomeDestination('u1')).resolves.toBe('personal-space');
  });

  it('never forces onboarding for an abandoned incomplete company', async () => {
    const service = makeService([{ onboardingCompletedAt: null }, { onboardingCompletedAt: null }]);
    await expect(service.getHomeDestination('u1')).resolves.not.toBe('onboarding');
  });

  it('routes to the dashboard once at least one company is onboarded', async () => {
    const service = makeService([
      { onboardingCompletedAt: null },
      { onboardingCompletedAt: new Date(10) },
    ]);
    await expect(service.getHomeDestination('u1')).resolves.toBe('dashboard');
  });
});
