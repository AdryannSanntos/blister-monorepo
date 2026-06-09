import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "../src/generated/prisma";
import {
  serializeBrandProfile,
  serializeCampaign,
  serializeCampaignFile,
} from "../src/rag/brand-brain.serializer";
import { ragIndexDocument } from "./rag-index-document";

const prisma = new PrismaClient();

export interface CompanyRagSyncPayload {
  companyId: string;
  campaignId?: string;
}

export const companyRagSync = task({
  id: "company-rag-sync",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: CompanyRagSyncPayload) => {
    logger.info("Starting company RAG sync", payload);

    const company = await prisma.company.findUnique({
      where: { id: payload.companyId },
      include: {
        brandProfile: true,
        campaigns: payload.campaignId
          ? { where: { id: payload.campaignId } }
          : { where: { status: { not: "ARCHIVED" } } },
        campaignFiles: payload.campaignId
          ? { where: { campaignId: payload.campaignId } }
          : true,
      },
    });

    if (!company) {
      logger.warn("Company not found", { companyId: payload.companyId });
      return { status: "not_found", synced: 0, skipped: 0, failed: 0 };
    }

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    if (company.brandProfile) {
      const content = serializeBrandProfile(company.brandProfile, company.name);
      if (content.trim()) {
        const result = await indexSource({
          companyId: company.id,
          sourceType: "BRAND_BRAIN",
          sourceId: company.brandProfile.id,
          title: `Cérebro da Marca: ${company.name}`,
          content,
          metadata: { brandProfileId: company.brandProfile.id },
        });
        if (result === "synced") synced += 1;
        if (result === "skipped") skipped += 1;
        if (result === "failed") failed += 1;
      }
    }

    for (const campaign of company.campaigns) {
      const result = await indexSource({
        companyId: company.id,
        sourceType: "CAMPAIGN",
        sourceId: campaign.id,
        title: `Campanha: ${campaign.name}`,
        content: serializeCampaign(campaign),
        campaignId: campaign.id,
        forceReindex: true,
      });
      if (result === "synced") synced += 1;
      if (result === "skipped") skipped += 1;
      if (result === "failed") failed += 1;
    }

    const campaignIds = new Set(company.campaigns.map((campaign) => campaign.id));
    for (const file of company.campaignFiles) {
      if (!campaignIds.has(file.campaignId)) continue;
      const content = serializeCampaignFile(file);
      if (!content) continue;

      const result = await indexSource({
        companyId: company.id,
        sourceType: "CAMPAIGN_FILE",
        sourceId: file.id,
        title: `Arquivo: ${file.name}`,
        content,
        campaignId: file.campaignId,
        forceReindex: true,
        metadata: {
          fileName: file.name,
          mimeType: file.mimeType,
          storageKey: file.storageKey,
        },
      });
      if (result === "synced") synced += 1;
      if (result === "skipped") skipped += 1;
      if (result === "failed") failed += 1;
    }

    logger.info("Company RAG sync completed", {
      companyId: payload.companyId,
      synced,
      skipped,
      failed,
    });

    return { status: "completed", synced, skipped, failed };
  },
});

async function indexSource(input: {
  companyId: string;
  sourceType: "BRAND_BRAIN" | "CAMPAIGN" | "CAMPAIGN_FILE";
  sourceId: string;
  title: string;
  content: string;
  campaignId?: string;
  forceReindex?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<"synced" | "skipped" | "failed"> {
  try {
    const result = await ragIndexDocument.triggerAndWait({
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      content: input.content,
      campaignId: input.campaignId,
      forceReindex: input.forceReindex ?? true,
      metadata: input.metadata,
    });

    if (!result.ok) return "failed";
    return result.output.status === "skipped" ? "skipped" : "synced";
  } catch (error) {
    logger.error("Failed to index source", { input, error });
    return "failed";
  }
}
