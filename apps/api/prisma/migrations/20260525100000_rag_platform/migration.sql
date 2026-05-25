-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- RagDocument: source-level unit of indexable content
CREATE TABLE "RagDocument" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType"     TEXT NOT NULL,
    "sourceId"       TEXT,
    "title"          TEXT,
    "contentHash"    TEXT,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "metadata"       JSONB NOT NULL DEFAULT '{}',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

-- RagChunk: split of a document
CREATE TABLE "RagChunk" (
    "id"         TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sequence"   INTEGER NOT NULL,
    "content"    TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata"   JSONB NOT NULL DEFAULT '{}',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

-- RagEmbedding: vector representation of a chunk
CREATE TABLE "RagEmbedding" (
    "id"             TEXT NOT NULL,
    "chunkId"        TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "model"          TEXT NOT NULL,
    "dimensions"     INTEGER NOT NULL,
    "vector"         vector(1536),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagEmbedding_pkey" PRIMARY KEY ("id")
);

-- RagIndexJob: async job tracking
CREATE TABLE "RagIndexJob" (
    "id"                TEXT NOT NULL,
    "organizationId"    TEXT NOT NULL,
    "documentId"        TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'queued',
    "errorMessage"      TEXT,
    "triggeredByUserId" TEXT,
    "startedAt"         TIMESTAMP(3),
    "completedAt"       TIMESTAMP(3),
    "metadata"          JSONB NOT NULL DEFAULT '{}',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagIndexJob_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "RagDocument_organizationId_sourceType_sourceId_key"
    ON "RagDocument"("organizationId", "sourceType", "sourceId");

CREATE UNIQUE INDEX "RagEmbedding_chunkId_key"
    ON "RagEmbedding"("chunkId");

-- Indexes
CREATE INDEX "RagDocument_organizationId_status_idx"
    ON "RagDocument"("organizationId", "status");

CREATE INDEX "RagDocument_organizationId_sourceType_idx"
    ON "RagDocument"("organizationId", "sourceType");

CREATE INDEX "RagChunk_documentId_sequence_idx"
    ON "RagChunk"("documentId", "sequence");

CREATE INDEX "RagEmbedding_organizationId_idx"
    ON "RagEmbedding"("organizationId");

-- ivfflat index for approximate nearest-neighbour search (L2 distance)
CREATE INDEX "RagEmbedding_vector_idx"
    ON "RagEmbedding" USING ivfflat ("vector" vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX "RagIndexJob_organizationId_status_idx"
    ON "RagIndexJob"("organizationId", "status");

CREATE INDEX "RagIndexJob_documentId_createdAt_idx"
    ON "RagIndexJob"("documentId", "createdAt");

-- Foreign keys
ALTER TABLE "RagChunk"
    ADD CONSTRAINT "RagChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RagEmbedding"
    ADD CONSTRAINT "RagEmbedding_chunkId_fkey"
    FOREIGN KEY ("chunkId") REFERENCES "RagChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RagIndexJob"
    ADD CONSTRAINT "RagIndexJob_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
