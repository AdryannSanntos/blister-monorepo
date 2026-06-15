const { execSync } = require('node:child_process');
const path = require('node:path');

try {
  const pkgPath = require.resolve('ffmpeg-static/package.json');
  execSync('node install.js', {
    cwd: path.dirname(pkgPath),
    stdio: 'inherit',
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[ensure-ffmpeg-static] skipped: ${message}`);
}
