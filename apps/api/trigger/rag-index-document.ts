import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient, type RagSourceType } from "../src/generated/prisma";
import { z } from "zod";

const prisma = new PrismaClient();

const DIMENSIONS = 1536;
const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 64;

const ingestPayloadSchema = z.object({
  companyId: z.string().min(1),
  sourceType: z.enum([
    "BRAND_BRAIN",
    "CAMPAIGN",
    "CAMPAIGN_FILE",
    "AGENT_LEARNING",
    "APPROVED_PIECE",
  ]),
  sourceId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(1),
  campaignId: z.string().optional(),
  agentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  forceReindex: z.boolean().default(false),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export const ragIndexDocument = task({
  id: "rag-index-document",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: IngestPayload) => {
    const validated = ingestPayloadSchema.parse(payload);
    logger.info("Starting RAG indexing", {
      sourceType: validated.sourceType,
      sourceId: validated.sourceId,
      companyId: validated.companyId,
    });

    const contentHash = hashContent(validated.content);

    const existing = await prisma.ragDocument.findFirst({
      where: {
        companyId: validated.companyId,
        sourceType: validated.sourceType,
        sourceId: validated.sourceId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing && !validated.forceReindex) {
      const existingHash = (existing.metadata as { contentHash?: string })?.contentHash;
      if (existingHash === contentHash) {
        logger.info("Document unchanged, skipping", { documentId: existing.id });
        return {
          documentId: existing.id,
          status: "skipped",
          chunksCreated: 0,
          embeddingsCreated: 0,
        };
      }
    }

    if (existing) {
      await prisma.ragDocument.deleteMany({
        where: {
          companyId: validated.companyId,
          sourceType: validated.sourceType,
          sourceId: validated.sourceId,
        },
      });
      logger.info("Deleted existing document", { documentId: existing.id });
    }

    const document = await prisma.ragDocument.create({
      data: {
        companyId: validated.companyId,
        sourceType: validated.sourceType,
        sourceId: validated.sourceId,
        title: validated.title,
        contentHash,
        campaignId: validated.campaignId,
        status: "INDEXING",
        metadata: {
          ...validated.metadata,
          contentHash,
        },
      },
    });

    logger.info("Created document", { documentId: document.id });

    try {
      const settings = await prisma.ragPlatformSettings.findUnique({
        where: { id: "default" },
      });

      const chunkSize = settings?.chunkSize ?? DEFAULT_CHUNK_SIZE;
      const chunkOverlap = settings?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

      const chunks = splitIntoChunks(validated.content, chunkSize, chunkOverlap);

      const createdChunks = await Promise.all(
        chunks.map((chunk, index) =>
          prisma.ragChunk.create({
            data: {
              documentId: document.id,
              companyId: validated.companyId,
              campaignId: validated.campaignId,
              agentId: validated.agentId,
              chunkIndex: index,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              metadata: (validated.metadata ?? {}) as Record<string, string | number | boolean | null>,
            },
          })
        )
      );

      logger.info("Created chunks", { count: createdChunks.length });

      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY is required");
      }

      const contents = createdChunks.map((c) => c.content);
      const embeddings = await generateEmbeddings(contents, openRouterApiKey);

      for (let i = 0; i < createdChunks.length; i++) {
        const chunk = createdChunks[i];
        const embedding = embeddings[i];

        await prisma.$executeRaw`
          INSERT INTO "RagEmbedding" ("id", "chunkId", "embeddingModel", "dimensions", "embedding", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${chunk.id},
            'text-embedding-3-small',
            ${DIMENSIONS},
            ${embedding}::vector,
            NOW()
          )
          ON CONFLICT ("chunkId") DO UPDATE SET
            "embedding" = ${embedding}::vector,
            "embeddingModel" = 'text-embedding-3-small'
        `;
      }

      logger.info("Created embeddings", { count: createdChunks.length });

      await prisma.ragDocument.update({
        where: { id: document.id },
        data: { status: "INDEXED" },
      });

      return {
        documentId: document.id,
        status: existing ? "updated" : "created",
        chunksCreated: createdChunks.length,
        embeddingsCreated: createdChunks.length,
      };
    } catch (error) {
      logger.error("Indexing failed", { error, documentId: document.id });

      await prisma.ragDocument.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });

      throw error;
    }
  },
});

function hashContent(content: string): string {
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 32);
}

interface ChunkData {
  content: string;
  tokenCount: number;
}

function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): ChunkData[] {
  const chunks: ChunkData[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

  let currentChunk = "";
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);

    if (currentTokens + sentenceTokens > chunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
      });

      const words = currentChunk.split(/\s+/);
      const tokensPerWord = 1.3;
      const wordsToKeep = Math.ceil(overlap / tokensPerWord);
      currentChunk = words.slice(-wordsToKeep).join(" ") + " " + sentence;
      currentTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += sentence + " ";
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: currentTokens,
    });
  }

  return chunks;
}

async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "https://blister.app",
      "X-Title": "Blister",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
      dimensions: DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  return data.data.map((item) => item.embedding);
}
