import { access } from 'node:fs/promises';
import path from 'node:path';

const ENTRY_RELATIVE = path.join('src', 'video', 'compositions', 'index.ts');

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate the Remotion root entry across Nest, Trigger.dev worker builds, and
 * local ts-node scripts. Trigger ships `src/video/**` via additionalFiles but
 * bundles task code under `.trigger/tmp/build-*`, so `__dirname/compositions`
 * does not exist at runtime.
 */
export async function resolveRemotionEntryPoint(): Promise<string> {
  const fromEnv = process.env.REMOTION_ENTRY_POINT?.trim();
  const candidates = [
    fromEnv,
    path.join(process.cwd(), ENTRY_RELATIVE),
    path.resolve(__dirname, ENTRY_RELATIVE),
    path.resolve(__dirname, 'compositions', 'index.ts'),
    path.resolve(process.cwd(), 'apps', 'api', ENTRY_RELATIVE),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Remotion composition entry not found. Set REMOTION_ENTRY_POINT or ensure ${ENTRY_RELATIVE} is deployed. Tried:\n${candidates.join('\n')}`,
  );
}
