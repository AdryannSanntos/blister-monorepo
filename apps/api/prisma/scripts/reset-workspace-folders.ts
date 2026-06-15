import { PrismaClient } from '../../src/generated/prisma';
import { resetWorkspaceFoldersAndFiles } from '../../src/files/workspace-folders.util';

const prisma = new PrismaClient();

async function main() {
  console.log('→ Removing all workspace files and folders...');
  await resetWorkspaceFoldersAndFiles(prisma);
  console.log('✓ Workspace folders reset to one folder per default agent.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
