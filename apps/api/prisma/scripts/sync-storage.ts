/**
 * Aligns the S3 bucket with the workspace Files tree in the database.
 *
 * Modes:
 *   reconcile  Re-key every WorkspaceFile to its canonical mirrored path
 *              (companies/{slug}/... or personal/{userId}/...), recreate folder
 *              placeholders, and delete orphan objects.
 *   reset      Delete EVERY object under companies/ and personal/ AND every
 *              WorkspaceFile row, then recreate folder placeholders. Use to wipe
 *              the legacy flat layout (e.g. companies/_pending/.../uploads/...).
 *
 * Usage (from apps/api):
 *   pnpm storage:sync reconcile          # dry-run, prints planned changes
 *   pnpm storage:sync reconcile --yes    # apply
 *   pnpm storage:sync reset --yes        # wipe + recreate placeholders
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  COMPANIES_PREFIX,
  PERSONAL_PREFIX,
  type WorkspaceStorageRoot,
  buildFileKey,
  buildFolderPlaceholderKey,
  buildFolderPrefix,
  workspaceRootPrefix,
} from '../../src/files/workspace-storage.util';
import { PrismaClient } from '../../src/generated/prisma';

// ─── Env (mirror ConfigModule.envFilePath: ['../../.env', '.env']) ───────────
function loadEnv(): void {
  for (const file of ['../../.env', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}
loadEnv();

const prisma = new PrismaClient();

function buildS3Client(): { client: S3Client; bucket: string } {
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';
  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: required('AWS_ACCESS_KEY_ID'),
      secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
    },
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
  });
  return { client, bucket: required('AWS_S3_BUCKET') };
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

/** Encodes a CopySource (URL-encode each segment, keep the slashes). */
function encodeCopySource(bucket: string, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${bucket}/${encodedKey}`;
}

type FolderRow = { id: string; parentId: string | null; name: string };

function folderSegments(foldersById: Map<string, FolderRow>, folderId: string): string[] {
  const segments: string[] = [];
  let current: string | null = folderId;
  while (current) {
    const folder = foldersById.get(current);
    if (!folder) break;
    segments.unshift(folder.name);
    current = folder.parentId;
  }
  return segments;
}

async function listAllKeys(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    token = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function deleteKeys(client: S3Client, bucket: string, keys: string[]): Promise<void> {
  const unique = [...new Set(keys)].filter(Boolean);
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

type WorkspaceTarget = {
  root: WorkspaceStorageRoot;
  scope: { companyId: string } | { personalSpaceId: string };
};

async function listWorkspaces(): Promise<WorkspaceTarget[]> {
  const companies = await prisma.company.findMany({
    select: { id: true, slug: true },
  });
  const personalSpaces = await prisma.personalSpace.findMany({
    select: { id: true, userId: true },
  });
  return [
    ...companies.map((c) => ({
      root: { kind: 'company', slug: c.slug } as WorkspaceStorageRoot,
      scope: { companyId: c.id },
    })),
    ...personalSpaces.map((p) => ({
      root: { kind: 'personal', userId: p.userId } as WorkspaceStorageRoot,
      scope: { personalSpaceId: p.id },
    })),
  ];
}

async function reconcile(client: S3Client, bucket: string, apply: boolean): Promise<void> {
  for (const target of await listWorkspaces()) {
    const folders = (await prisma.workspaceFolder.findMany({
      where: target.scope,
      select: { id: true, parentId: true, name: true },
    })) as FolderRow[];
    const foldersById = new Map(folders.map((f) => [f.id, f]));

    const files = await prisma.workspaceFile.findMany({
      where: target.scope,
      select: { id: true, folderId: true, name: true, storageKey: true },
    });

    const allowed = new Set<string>();

    // Folder placeholders.
    for (const folder of folders) {
      const prefix = buildFolderPrefix(target.root, folderSegments(foldersById, folder.id));
      const placeholder = buildFolderPlaceholderKey(prefix);
      allowed.add(placeholder);
      if (apply) {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: placeholder, Body: '' }));
      }
    }

    // Re-key files to canonical paths.
    for (const file of files) {
      const prefix = buildFolderPrefix(target.root, folderSegments(foldersById, file.folderId));
      const canonicalKey = buildFileKey(prefix, file.name);
      allowed.add(canonicalKey);

      if (file.storageKey === canonicalKey) continue;
      console.log(`  move ${file.storageKey} -> ${canonicalKey}`);
      if (!apply) continue;

      if (await objectExists(client, bucket, file.storageKey)) {
        await client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: encodeCopySource(bucket, file.storageKey),
            Key: canonicalKey,
          }),
        );
        await deleteKeys(client, bucket, [file.storageKey]);
      }
      await prisma.workspaceFile.update({
        where: { id: file.id },
        data: { storageKey: canonicalKey },
      });
    }

    // Delete orphans under this workspace root.
    const rootPrefix = workspaceRootPrefix(target.root);
    const existing = await listAllKeys(client, bucket, rootPrefix);
    const orphans = existing.filter((key) => !allowed.has(key));
    if (orphans.length) {
      console.log(`  ${rootPrefix}: ${orphans.length} orphan object(s)`);
      for (const key of orphans) console.log(`    orphan ${key}`);
      if (apply) await deleteKeys(client, bucket, orphans);
    }
  }
}

async function reset(client: S3Client, bucket: string, apply: boolean): Promise<void> {
  for (const prefix of [COMPANIES_PREFIX, PERSONAL_PREFIX]) {
    const keys = await listAllKeys(client, bucket, prefix);
    console.log(`  ${prefix}: ${keys.length} object(s) to delete`);
    if (apply && keys.length) await deleteKeys(client, bucket, keys);
  }

  const fileCount = await prisma.workspaceFile.count();
  console.log(`  workspaceFile rows to delete: ${fileCount}`);
  if (apply) await prisma.workspaceFile.deleteMany({});

  // Recreate folder placeholders so the (now empty) tree stays visible.
  if (apply) {
    for (const target of await listWorkspaces()) {
      const folders = (await prisma.workspaceFolder.findMany({
        where: target.scope,
        select: { id: true, parentId: true, name: true },
      })) as FolderRow[];
      const foldersById = new Map(folders.map((f) => [f.id, f]));
      for (const folder of folders) {
        const prefix = buildFolderPrefix(target.root, folderSegments(foldersById, folder.id));
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: buildFolderPlaceholderKey(prefix),
            Body: '',
          }),
        );
      }
    }
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const apply = process.argv.includes('--yes');

  if (mode !== 'reconcile' && mode !== 'reset') {
    console.error('Usage: storage:sync <reconcile|reset> [--yes]');
    process.exit(1);
  }

  const { client, bucket } = buildS3Client();
  console.log(`→ Mode: ${mode} | bucket: ${bucket} | ${apply ? 'APPLY' : 'DRY-RUN'}`);

  if (mode === 'reconcile') {
    await reconcile(client, bucket, apply);
  } else {
    await reset(client, bucket, apply);
  }

  console.log(apply ? '✓ Storage sync applied.' : '✓ Dry-run complete (pass --yes to apply).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
