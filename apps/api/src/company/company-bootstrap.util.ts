import { ensureWorkspaceAgentFolders } from '../files/workspace-folders.util';
import type { Company, PrismaClient } from '@company-os/db';

type BootstrapUser = {
  id: string;
  name?: string | null;
  email: string;
};

function buildUniqueSlug(db: PrismaClient, email: string): Promise<string> {
  const baseSlug = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  return (async () => {
    let slug = baseSlug;
    let i = 1;
    while (await db.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i}`;
      i++;
    }
    return slug;
  })();
}

export async function createCompanyForUser(
  db: PrismaClient,
  user: BootstrapUser,
  name: string,
): Promise<Company> {
  const settings = await db.platformCreditSettings.findUnique({
    where: { id: 'default' },
  });
  const freeTierAmount = settings?.freeTierAmount ?? 20;
  const slug = await buildUniqueSlug(db, user.email);

  return db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ownerUserId: user.id,
        name,
        slug,
        onboardingCompletedAt: new Date(),
      },
    });

    await tx.creditBalance.create({
      data: {
        companyId: company.id,
        amount: freeTierAmount,
        currency: 'USD',
      },
    });

    await tx.creditLedger.create({
      data: {
        companyId: company.id,
        type: 'CREDIT',
        amount: freeTierAmount,
        balanceAfter: freeTierAmount,
        currency: 'USD',
        description: 'Free tier credit',
      },
    });

    await tx.workspaceSettings.create({
      data: {
        companyId: company.id,
        displayName: name,
      },
    });

    await ensureWorkspaceAgentFolders(tx, { companyId: company.id });

    const ownerRole = await tx.role.findUnique({ where: { name: 'owner' } });
    if (ownerRole) {
      await tx.companyMember.upsert({
        where: { companyId_userId: { companyId: company.id, userId: user.id } },
        update: { roleId: ownerRole.id },
        create: {
          companyId: company.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      });
    }

    return company;
  });
}
