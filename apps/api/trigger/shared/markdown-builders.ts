import { PrismaClient } from '../../src/generated/prisma';
import { serializeContextMarkdown } from '../../src/context/context-markdown.serializer';
import { serializeDesignSystemMarkdown } from '../../src/design-system/design-system-markdown.serializer';

export async function buildDesignSystemMarkdown(prisma: PrismaClient, organizationId: string) {
  const profile = await prisma.designSystemProfile.findUnique({
    where: { organizationId },
    include: {
      colorGroups: { include: { colors: true }, orderBy: { sortOrder: 'asc' } },
      assets: { orderBy: { updatedAt: 'desc' } },
    },
  });

  return serializeDesignSystemMarkdown({
    brandEssence: profile?.brandEssence,
    desiredPerception: profile?.desiredPerception,
    visualStyle: profile?.visualStyle,
    antiPatterns: profile?.antiPatterns,
    conceptualReferences: profile?.conceptualReferences,
    aiNotes: profile?.aiNotes,
    colorGroups: profile?.colorGroups ?? [],
    assets: profile?.assets ?? [],
  });
}

export async function buildContextMarkdown(prisma: PrismaClient, organizationId: string) {
  const draft = await prisma.onboardingDraft.findUnique({ where: { organizationId } });
  const data = typeof draft?.data === 'object' && draft?.data !== null ? draft.data : {};
  return serializeContextMarkdown(data as Record<string, string>);
}

export async function buildContextMarkdownFromSources(prisma: PrismaClient, organizationId: string) {
  const base = await buildContextMarkdown(prisma, organizationId);

  const sources = await prisma.contextSource.findMany({
    where: { organizationId, pipelineStatus: 'approved' },
    orderBy: { updatedAt: 'desc' },
  });

  if (sources.length === 0) return base;

  const files = sources.filter(
    (s) => s.sourceKind === 'file' && Boolean(s.fileName || s.publicUrl || s.objectKey || s.title),
  );
  const urls = sources.filter(
    (s) => s.sourceKind === 'url' && Boolean(s.sourceUrl || s.normalizedContent || s.extractedContent || s.description),
  );
  const manual = sources.filter(
    (s) => s.sourceKind === 'manual' && Boolean(s.normalizedContent ?? s.extractedContent ?? s.description),
  );

  const lines: string[] = [];

  if (files.length > 0) {
    lines.push('## Attached files', '');
    for (const s of files) {
      const ref = s.publicUrl
        ? `[${s.fileName ?? s.title}](${s.publicUrl})`
        : (s.objectKey ?? s.fileName ?? s.title);
      lines.push(`### ${s.title}${s.category ? ` (${s.category})` : ''}`, '');
      if (ref) lines.push(`- File: ${ref}`);
      if (s.description) lines.push(`- Description: ${s.description}`);
      const content = s.normalizedContent ?? s.extractedContent;
      if (content) { lines.push('', content); }
      lines.push('');
    }
  }

  if (urls.length > 0) {
    lines.push('## Reference URLs', '');
    for (const s of urls) {
      lines.push(`### ${s.title}${s.category ? ` (${s.category})` : ''}`, '');
      if (s.sourceUrl) lines.push(`- URL: ${s.sourceUrl}`);
      if (s.description) lines.push(`- Description: ${s.description}`);
      const content = s.normalizedContent ?? s.extractedContent;
      if (content) { lines.push('', content.slice(0, 3000)); }
      lines.push('');
    }
  }

  if (manual.length > 0) {
    lines.push('## Manual knowledge', '');
    for (const s of manual) {
      lines.push(`### ${s.title}${s.category ? ` (${s.category})` : ''}`, '');
      const content = s.normalizedContent ?? s.extractedContent ?? s.description;
      if (content) lines.push(content);
      lines.push('');
    }
  }

  if (lines.length === 0) return base;

  return [base, ...lines].join('\n');
}
