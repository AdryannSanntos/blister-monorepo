/**
 * Maps the workspace Files tree (WorkspaceFolder/WorkspaceFile in the DB) onto
 * S3 object keys so the bucket layout mirrors the database exactly:
 *
 *   companies/{slug}/{folder}/{subfolder}/{file}
 *   personal/{userId}/{folder}/{subfolder}/{file}
 *
 * The DB is the source of truth; every Files mutation re-derives the key from
 * this util so both sides stay in sync (same folder names, same file names).
 */

export const COMPANIES_PREFIX = 'companies/';
export const PERSONAL_PREFIX = 'personal/';

/** Zero-byte marker so empty folders are visible in the bucket browser. */
export const FOLDER_PLACEHOLDER = '.keep';

export type WorkspaceStorageRoot =
  | { kind: 'company'; slug: string }
  | { kind: 'personal'; userId: string };

/**
 * Sanitizes a single path segment (folder or file name). Preserves readable
 * characters (unicode letters, spaces, accents) so the bucket shows the same
 * names as the UI, while stripping anything that could break the key or escape
 * the workspace scope (slashes, control chars, path traversal).
 */
export function sanitizeStorageSegment(name: string): string {
  const cleaned = Array.from(name.normalize('NFC'))
    // drop ASCII control characters (codepoints below space and DEL)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    // collapse traversal sequences
    .replace(/\.{2,}/g, '.')
    // path separators are not allowed inside a segment
    .replace(/[/\\]+/g, '-')
    // collapse whitespace runs
    .replace(/\s+/g, ' ')
    .trim()
    // a leading dot would hide the object in some browsers
    .replace(/^\.+/, '');

  return cleaned.length > 0 ? cleaned : 'untitled';
}

export function workspaceRootPrefix(root: WorkspaceStorageRoot): string {
  if (root.kind === 'company') {
    return `${COMPANIES_PREFIX}${sanitizeStorageSegment(root.slug)}/`;
  }
  return `${PERSONAL_PREFIX}${sanitizeStorageSegment(root.userId)}/`;
}

/**
 * Builds the S3 prefix for a folder given the ordered folder-name segments from
 * the workspace root down to (and including) the target folder.
 */
export function buildFolderPrefix(root: WorkspaceStorageRoot, folderSegments: string[]): string {
  const base = workspaceRootPrefix(root);
  if (folderSegments.length === 0) return base;
  const path = folderSegments.map(sanitizeStorageSegment).join('/');
  return `${base}${path}/`;
}

/** Builds the full object key for a file living under `folderPrefix`. */
export function buildFileKey(folderPrefix: string, fileName: string): string {
  return `${folderPrefix}${sanitizeStorageSegment(fileName)}`;
}

/** Object key of the placeholder marker for a folder prefix. */
export function buildFolderPlaceholderKey(folderPrefix: string): string {
  return `${folderPrefix}${FOLDER_PLACEHOLDER}`;
}

/**
 * Splits "name (2).ext" style suffixes so collision resolution can re-append a
 * counter while keeping the extension last. Returns { base, ext } where ext
 * includes the leading dot (or is empty).
 */
export function splitFileName(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return { base: fileName, ext: '' };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
}

/** Produces "name (n).ext" used when a name already exists in the folder. */
export function withCollisionSuffix(fileName: string, counter: number): string {
  const { base, ext } = splitFileName(fileName);
  return `${base} (${counter})${ext}`;
}
