import type { Company, PrismaClient } from '../generated/prisma';

type BootstrapUser = {
  id: string;
  name?: string | null;
  email: string;
};

async function ensurePersonalSpace(db: PrismaClient, user: BootstrapUser) {
  const existing = await db.personalSpace.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const name = user.name ?? user.email.split('@')[0];

  return db.$transaction(async (tx) => {
    const personalSpace = await tx.personalSpace.create({
      data: { userId: user.id, name },
    });

    await tx.workspaceSettings.create({
      data: { personalSpaceId: personalSpace.id, displayName: name },
    });

    const settings = await tx.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });
    const freeTierAmount = settings?.freeTierAmount ?? 20;

    await tx.personalCreditBalance.create({
      data: {
        personalSpaceId: personalSpace.id,
        amount: freeTierAmount,
        currency: 'USD',
      },
    });

    for (const folder of [
      { name: 'Uploads', systemKey: 'uploads' },
      { name: 'Gerados', systemKey: 'generated' },
      { name: 'Integrações', systemKey: 'integrations' },
    ]) {
      await tx.workspaceFolder.create({
        data: {
          personalSpaceId: personalSpace.id,
          name: folder.name,
          kind: 'SYSTEM',
          systemKey: folder.systemKey,
        },
      });
    }

    return personalSpace;
  });
}

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
  if (ownerRole) {
    await db.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: user.id, roleId: ownerRole.id },
    });
  }

  await ensurePersonalSpace(db, user);
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

    await tx.workspaceSettings.create({
      data: {
        companyId: company.id,
        displayName: name,
      },
    });

    for (const folder of [
      { name: 'Uploads', systemKey: 'uploads' },
      { name: 'Gerados', systemKey: 'generated' },
      { name: 'Integrações', systemKey: 'integrations' },
    ]) {
      await tx.workspaceFolder.create({
        data: {
          companyId: company.id,
          name: folder.name,
          kind: 'SYSTEM',
          systemKey: folder.systemKey,
        },
      });
    }

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
