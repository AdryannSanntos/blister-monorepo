const fs = require('node:fs');
const path = require('node:path');

const apiRoot = path.join(__dirname, '..');
const srcDir = path.join(apiRoot, 'src/generated/prisma');
const destDir = path.join(apiRoot, 'dist/src/generated/prisma');

const fail = (message) => {
  console.error(`[sync-prisma-dist] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(path.join(srcDir, 'index.js'))) {
  fail('Prisma client not found. Run `pnpm prisma:generate` first.');
}

fs.mkdirSync(path.dirname(destDir), { recursive: true });
fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });

console.log('[sync-prisma-dist] copied src/generated/prisma → dist/src/generated/prisma');
