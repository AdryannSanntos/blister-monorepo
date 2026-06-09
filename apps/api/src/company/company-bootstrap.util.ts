import type { Company, PrismaClient } from '../generated/prisma';

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

export async function bootstrapUserOnSignup(
  db: PrismaClient,
  user: BootstrapUser,
): Promise<void> {
  await db.user.update({
    where: { id: user.id },
    data: { userType: 'BUSINESS' },
  });

  const ownerRole = await db.role.findUnique({ where: { name: 'owner' } });
  if (!ownerRole) return;

  await db.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: user.id, roleId: ownerRole.id },
  });
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

    return company;
  });
}

/** @deprecated Use bootstrapUserOnSignup + createCompanyForUser during onboarding */
export async function bootstrapCompanyForUser(
  db: PrismaClient,
  user: BootstrapUser,
): Promise<Company> {
  await bootstrapUserOnSignup(db, user);
  return createCompanyForUser(
    db,
    user,
    user.name ?? user.email.split('@')[0],
  );
}
