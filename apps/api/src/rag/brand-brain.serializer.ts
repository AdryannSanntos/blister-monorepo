import { createHash } from 'node:crypto';
import {
  normalizeBrandAssets,
  normalizeBrandPalette,
  normalizeLogoVariants,
} from '@company-os/types';
import type { BrandProfile, Campaign, CampaignFile } from '../generated/prisma';

export const hashRagContent = (content: string): string =>
  createHash('sha256').update(content).digest('hex').slice(0, 32);

export interface BrandBrainSerializeInput {
  companyName?: string;
  brandVoice: string;
  niche?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  mainProducts?: string | null;
  differentiators?: string | null;
  visualStyle?: string | null;
  typography?: string | null;
  marketingObjective?: string | null;
  socialNetworks?: unknown;
  palette?: unknown;
  logoVariants?: unknown;
  logoStorageKey?: string | null;
  brandAssets?: unknown;
}

export const serializeBrandBrain = (input: BrandBrainSerializeInput): string => {
  const parts: string[] = [];

  if (input.companyName?.trim()) {
    parts.push(`# Empresa: ${input.companyName.trim()}`);
  }
  if (input.brandVoice?.trim()) {
    parts.push(`## Tom de Voz\n${input.brandVoice.trim()}`);
  }
  if (input.niche?.trim()) {
    parts.push(`## Nicho\n${input.niche.trim()}`);
  }
  if (input.description?.trim()) {
    parts.push(`## Descrição\n${input.description.trim()}`);
  }
  if (input.targetAudience?.trim()) {
    parts.push(`## Público-Alvo\n${input.targetAudience.trim()}`);
  }
  if (input.mainProducts?.trim()) {
    parts.push(`## Produtos/Serviços Principais\n${input.mainProducts.trim()}`);
  }
  if (input.differentiators?.trim()) {
    parts.push(`## Diferenciais\n${input.differentiators.trim()}`);
  }
  if (input.visualStyle?.trim()) {
    parts.push(`## Estilo Visual\n${input.visualStyle.trim()}`);
  }
  if (input.typography?.trim()) {
    parts.push(`## Tipografia\n${input.typography.trim()}`);
  }
  if (input.marketingObjective) {
    parts.push(`## Objetivo de Marketing\n${input.marketingObjective}`);
  }

  const socialNetworks = Array.isArray(input.socialNetworks)
    ? input.socialNetworks.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  if (socialNetworks.length > 0) {
    parts.push(`## Redes Sociais\n${socialNetworks.map((network) => `- ${network}`).join('\n')}`);
  }

  const palette = normalizeBrandPalette(input.palette);
  const paletteLines = [
    palette.primary.name || palette.primary.hex
      ? `- Primária: ${palette.primary.name || 'Primária'} (${palette.primary.hex})`
      : null,
    palette.secondary.name || palette.secondary.hex
      ? `- Secundária: ${palette.secondary.name || 'Secundária'} (${palette.secondary.hex})`
      : null,
    ...palette.additional.map(
      (color) => `- ${color.name || 'Cor'} (${color.hex})`,
    ),
  ].filter(Boolean);
  if (paletteLines.length > 0) {
    parts.push(`## Paleta de Cores\n${paletteLines.join('\n')}`);
  }

  const logoVariants = normalizeLogoVariants(input.logoVariants);
  const logoLines = Object.entries(logoVariants)
    .filter(([, key]) => typeof key === 'string' && key.trim().length > 0)
    .map(([variant, key]) => `- ${variant}: ${key}`);
  if (input.logoStorageKey?.trim() && !logoVariants.primary) {
    logoLines.unshift(`- primary: ${input.logoStorageKey.trim()}`);
  }
  if (logoLines.length > 0) {
    parts.push(`## Logos\n${logoLines.join('\n')}`);
  }

  const assets = normalizeBrandAssets(input.brandAssets);
  if (assets.length > 0) {
    const assetLines = assets.map(
      (asset) =>
        `- ${asset.name} (${asset.mimeType ?? 'arquivo'}) [${asset.storageKey}]`,
    );
    parts.push(`## Arquivos da Marca\n${assetLines.join('\n')}`);
  }

  return parts.join('\n\n');
};

export const serializeBrandProfile = (
  profile: BrandProfile,
  companyName?: string,
): string =>
  serializeBrandBrain({
    companyName,
    brandVoice: profile.brandVoice,
    niche: profile.niche,
    description: profile.description,
    targetAudience: profile.targetAudience,
    mainProducts: profile.mainProducts,
    differentiators: profile.differentiators,
    visualStyle: profile.visualStyle,
    typography: profile.typography,
    marketingObjective: profile.marketingObjective,
    socialNetworks: profile.socialNetworks,
    palette: profile.palette,
    logoVariants: profile.logoVariants,
    logoStorageKey: profile.logoStorageKey,
    brandAssets: profile.brandAssets,
  });

export const serializeCampaign = (
  campaign: Pick<Campaign, 'name' | 'objective' | 'context'>,
): string => {
  let content = `# Campanha: ${campaign.name}\n\n## Objetivo\n${campaign.objective}`;
  if (campaign.context?.trim()) {
    content += `\n\n## Contexto\n${campaign.context.trim()}`;
  }
  return content;
};

export const serializeCampaignFile = (
  file: Pick<CampaignFile, 'name' | 'type' | 'mimeType' | 'extractedText' | 'caption'>,
): string | null => {
  const text = file.extractedText?.trim() || file.caption?.trim();
  if (!text) return null;

  return [
    `# Arquivo: ${file.name}`,
    `Tipo: ${file.type}`,
    `MIME: ${file.mimeType}`,
    '',
    text,
  ].join('\n');
};
