const { execSync } = require('node:child_process');

if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
  console.log(
    `[ensure-puppeteer-chrome] skipped: using PUPPETEER_EXECUTABLE_PATH=${process.env.PUPPETEER_EXECUTABLE_PATH}`,
  );
  process.exit(0);
}

try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: undefined },
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[ensure-puppeteer-chrome] skipped: ${message}`);
}
