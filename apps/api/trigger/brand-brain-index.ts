import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "../src/generated/prisma";
import { ragIndexDocument } from "./rag-index-document";

const prisma = new PrismaClient();

export interface BrandBrainIndexPayload {
  companyId: string;
  brandProfileId: string;
}

export const brandBrainIndex = task({
  id: "brand-brain-index",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: BrandBrainIndexPayload) => {
    logger.info("Starting Brand Brain indexing", {
      companyId: payload.companyId,
      brandProfileId: payload.brandProfileId,
    });

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { id: payload.brandProfileId },
      include: { company: true },
    });

    if (!brandProfile) {
      logger.warn("Brand profile not found", { brandProfileId: payload.brandProfileId });
      return { status: "not_found" };
    }

    const content = serializeBrandBrain({
      brandVoice: brandProfile.brandVoice,
      niche: brandProfile.niche,
      description: brandProfile.description,
      targetAudience: brandProfile.targetAudience,
      mainProducts: brandProfile.mainProducts,
      differentiators: brandProfile.differentiators,
      visualStyle: brandProfile.visualStyle,
    });

    const result = await ragIndexDocument.triggerAndWait({
      companyId: payload.companyId,
      sourceType: "BRAND_BRAIN",
      sourceId: payload.brandProfileId,
      title: `Cérebro da Marca: ${brandProfile.company.name}`,
      content,
      forceReindex: true,
      metadata: {
        brandProfileId: payload.brandProfileId,
        companyName: brandProfile.company.name,
      },
    });

    logger.info("Brand Brain indexed", {
      documentId: result.ok ? result.output.documentId : null,
      status: result.ok ? result.output.status : "failed",
    });

    return result.ok ? result.output : { status: "failed" };
  },
});

interface BrandBrainContent {
  brandVoice: string;
  niche?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  mainProducts?: string | null;
  differentiators?: string | null;
  visualStyle?: string | null;
}

function serializeBrandBrain(content: BrandBrainContent): string {
  const parts: string[] = [];

  if (content.brandVoice) {
    parts.push(`## Tom de Voz\n${content.brandVoice}`);
  }
  if (content.niche) {
    parts.push(`## Nicho\n${content.niche}`);
  }
  if (content.description) {
    parts.push(`## Descrição\n${content.description}`);
  }
  if (content.targetAudience) {
    parts.push(`## Público-Alvo\n${content.targetAudience}`);
  }
  if (content.mainProducts) {
    parts.push(`## Produtos/Serviços Principais\n${content.mainProducts}`);
  }
  if (content.differentiators) {
    parts.push(`## Diferenciais\n${content.differentiators}`);
  }
  if (content.visualStyle) {
    parts.push(`## Estilo Visual\n${content.visualStyle}`);
  }

  return parts.join("\n\n");
}
