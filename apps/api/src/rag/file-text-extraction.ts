import JSZip from 'jszip';
import { PDFParse } from 'pdf-parse';

type ExtractTextInput = {
  buffer: Buffer;
  contentType?: string | null;
  fileName?: string | null;
};

const MAX_EXTRACTED_TEXT_LENGTH = 40_000;
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: false });

function normalizeWhitespace(value: string): string {
  return value.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(value: string): string {
  return value.length > MAX_EXTRACTED_TEXT_LENGTH
    ? value.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
    : value;
}

function stripXml(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<\/?w:(?:p|tr|br|tab)[^>]*>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}

function extensionOf(fileName?: string | null): string {
  const normalized = fileName?.trim().toLowerCase() ?? '';
  const dot = normalized.lastIndexOf('.');
  return dot >= 0 ? normalized.slice(dot) : '';
}

function isTextLike(contentType: string, ext: string): boolean {
  return (
    contentType.startsWith('text/') ||
    ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.svg', '.html'].includes(ext) ||
    ['application/json', 'application/xml', 'image/svg+xml'].includes(contentType)
  );
}

async function extractPdf(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return normalizeWhitespace(parsed.text ?? '');
  } finally {
    await parser.destroy();
  }
}

async function extractFromZipXml(
  buffer: Buffer,
  selectors: ((path: string) => boolean)[],
): Promise<string | null> {
  const zip = await JSZip.loadAsync(buffer);
  const contents = await Promise.all(
    Object.keys(zip.files)
      .filter((path) => selectors.some((match) => match(path)))
      .sort((a, b) => a.localeCompare(b))
      .map(async (path) => stripXml(await zip.files[path]!.async('text'))),
  );

  return normalizeWhitespace(contents.filter(Boolean).join('\n\n'));
}

async function extractDocx(buffer: Buffer): Promise<string | null> {
  return extractFromZipXml(buffer, [
    (path) => path.startsWith('word/document'),
    (path) => path.startsWith('word/header'),
    (path) => path.startsWith('word/footer'),
  ]);
}

async function extractPptx(buffer: Buffer): Promise<string | null> {
  return extractFromZipXml(buffer, [(path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path)]);
}

async function extractXlsx(buffer: Buffer): Promise<string | null> {
  return extractFromZipXml(buffer, [
    (path) => path === 'xl/sharedStrings.xml',
    (path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path),
  ]);
}

export async function extractTextFromBuffer(input: ExtractTextInput): Promise<string | null> {
  const contentType = input.contentType?.toLowerCase().trim() ?? '';
  const ext = extensionOf(input.fileName);

  try {
    if (isTextLike(contentType, ext)) {
      return truncate(normalizeWhitespace(TEXT_DECODER.decode(input.buffer)));
    }

    if (contentType === 'application/pdf' || ext === '.pdf') {
      const extracted = await extractPdf(input.buffer);
      return extracted ? truncate(extracted) : null;
    }

    if (
      contentType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      const extracted = await extractDocx(input.buffer);
      return extracted ? truncate(extracted) : null;
    }

    if (
      contentType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      ext === '.pptx'
    ) {
      const extracted = await extractPptx(input.buffer);
      return extracted ? truncate(extracted) : null;
    }

    if (
      contentType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === '.xlsx'
    ) {
      const extracted = await extractXlsx(input.buffer);
      return extracted ? truncate(extracted) : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildSearchableDocument(
  sections: Array<{ label?: string; value?: string | null | undefined }>,
): string {
  return sections
    .map((section) => {
      const value = normalizeWhitespace(section.value ?? '');
      if (!value) return null;
      return section.label ? `${section.label}: ${value}` : value;
    })
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
}
