type NullableText = string | null | undefined;

export type DesignSystemMarkdownColor = {
  id?: string;
  name: string;
  value: string;
  displayFormat: string;
  semanticRole: string;
  usageNote?: NullableText;
  restrictionNote?: NullableText;
  sortOrder?: number;
};

export type DesignSystemMarkdownColorGroup = {
  id?: string;
  name: string;
  description?: NullableText;
  sortOrder?: number;
  colors: DesignSystemMarkdownColor[];
};

export type DesignSystemMarkdownAsset = {
  id?: string;
  title?: NullableText;
  description?: NullableText;
  primaryRole: string;
  secondaryTags: string[];
  fileName: string;
  contentType: string;
  objectKey: string;
};

export type DesignSystemMarkdownInput = {
  brandEssence?: NullableText;
  desiredPerception?: NullableText;
  visualStyle?: NullableText;
  antiPatterns?: NullableText;
  conceptualReferences?: NullableText;
  aiNotes?: NullableText;
  colorGroups: DesignSystemMarkdownColorGroup[];
  assets: DesignSystemMarkdownAsset[];
};

function text(value: NullableText) {
  return value?.trim() || null;
}

function line(label: string, value: NullableText) {
  const content = text(value);
  return content ? `- ${label}: ${content}` : null;
}

function section(title: string, lines: string[]) {
  return [`## ${title}`, '', ...lines, ''].join('\n');
}

export function serializeDesignSystemMarkdown(input: DesignSystemMarkdownInput) {
  const colorGroups = [...input.colorGroups].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
  const assets = [...input.assets].sort(
    (a, b) => a.primaryRole.localeCompare(b.primaryRole) || a.fileName.localeCompare(b.fileName),
  );

  const overview = [line('Brand essence', input.brandEssence)].filter(Boolean) as string[];
  const identity = [
    line('Desired perception', input.desiredPerception),
    line('Visual style', input.visualStyle),
    line('Conceptual references', input.conceptualReferences),
  ].filter(Boolean) as string[];
  const restrictions = [line('What to avoid', input.antiPatterns)].filter(Boolean) as string[];
  const aiNotes = [line('Operational notes for AI', input.aiNotes)].filter(Boolean) as string[];

  const colorLines = colorGroups.flatMap((group) => {
    const sortedColors = [...group.colors].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    );
    const groupLines = [`### ${group.name}`, '', text(group.description) ?? 'No group description.'];
    if (sortedColors.length === 0) return [...groupLines, '', '- No colors registered in this group.'];
    return [
      ...groupLines,
      '',
      ...sortedColors.map((color) => {
        const usage = text(color.usageNote) ? ` ${text(color.usageNote)}` : '';
        const restriction = text(color.restrictionNote)
          ? ` Restriction: ${text(color.restrictionNote)}.`
          : '';
        return `- ${color.name}: ${color.value} (${color.displayFormat}) — ${color.semanticRole}.${usage}${restriction}`;
      }),
    ];
  });

  const assetLines = assets.map((asset) => {
    const title = text(asset.title) ?? asset.fileName;
    const description = text(asset.description) ? ` — ${text(asset.description)}` : '';
    const tags = asset.secondaryTags.length ? ` Tags: ${asset.secondaryTags.join(', ')}.` : '';
    return `- ${title} — ${asset.primaryRole} — ${asset.fileName}${description}${tags}`;
  });

  const logoLines = assets
    .filter((asset) => asset.primaryRole === 'logo' || asset.primaryRole === 'logo-variation')
    .map((asset) => `- ${text(asset.title) ?? asset.fileName}: ${asset.fileName}`);

  const visualReferenceLines = assets
    .filter((asset) => asset.primaryRole.includes('reference') || asset.primaryRole.includes('visual'))
    .map((asset) => `- ${text(asset.title) ?? asset.fileName}: ${asset.primaryRole}`);

  return [
    '# Design System',
    '',
    section('Brand overview', overview.length ? overview : ['No brand overview has been registered yet.']),
    section('Identity principles', identity.length ? identity : ['No identity principles have been registered yet.']),
    section('Color palette', colorLines.length ? colorLines : ['No official color palette has been registered yet.']),
    section('Color restrictions and usage rules', restrictions.length ? restrictions : ['No color restrictions have been registered yet.']),
    section('Official assets', assetLines.length ? assetLines : ['No official design assets have been registered yet.']),
    section('Logo usage guidance', logoLines.length ? logoLines : ['No logo usage guidance has been registered yet.']),
    section('Visual references and aesthetic direction', visualReferenceLines.length ? visualReferenceLines : ['No visual references have been registered yet.']),
    section('Operational notes for AI', aiNotes.length ? aiNotes : ['No AI-facing visual notes have been registered yet.']),
    section('Known gaps and pending decisions', ['Review missing sections before relying on this context for high-stakes visual output.']),
  ].join('\n');
}
