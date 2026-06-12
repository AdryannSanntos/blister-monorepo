-- CreateEnum
CREATE TYPE "MarketplaceItemType" AS ENUM ('EDIT_STYLE', 'POST_STYLE', 'PACK', 'TEMPLATE', 'ASSET', 'AGENT');

-- CreateEnum
CREATE TYPE "WorkspaceFolderKind" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "WorkspaceFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkspaceFileOrigin" AS ENUM ('UPLOAD', 'AGENT_RUN', 'INTEGRATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RagSourceType" ADD VALUE 'WORKSPACE_SETTINGS';
ALTER TYPE "RagSourceType" ADD VALUE 'WORKSPACE_FILE';

-- CreateTable
CREATE TABLE "PersonalSpace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalCreditBalance" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalCreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "displayName" TEXT,
    "niche" TEXT,
    "audience" TEXT,
    "voice" TEXT,
    "positioning" TEXT,
    "contentPreferences" TEXT,
    "logoStorageKey" TEXT,
    "palette" JSONB NOT NULL DEFAULT '[]',
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "MarketplaceItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "flag" TEXT,
    "description" TEXT NOT NULL,
    "palette" JSONB NOT NULL DEFAULT '[]',
    "specs" JSONB NOT NULL DEFAULT '{}',
    "includes" JSONB NOT NULL DEFAULT '[]',
    "refId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceEntitlement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "redeemedByUserId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceFolder" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "WorkspaceFolderKind" NOT NULL DEFAULT 'USER',
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceFile" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "status" "WorkspaceFileStatus" NOT NULL DEFAULT 'PENDING',
    "extractData" BOOLEAN NOT NULL DEFAULT false,
    "extractedText" TEXT,
    "origin" "WorkspaceFileOrigin" NOT NULL DEFAULT 'UPLOAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "personalSpaceId" TEXT,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "linkedAgentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalSpace_userId_key" ON "PersonalSpace"("userId");

-- CreateIndex
CREATE INDEX "PersonalSpace_userId_idx" ON "PersonalSpace"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalCreditBalance_personalSpaceId_key" ON "PersonalCreditBalance"("personalSpaceId");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_idx" ON "CompanyMember"("companyId");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_personalSpaceId_key" ON "WorkspaceSettings"("personalSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_companyId_key" ON "WorkspaceSettings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceItem_slug_key" ON "MarketplaceItem"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceItem_type_idx" ON "MarketplaceItem"("type");

-- CreateIndex
CREATE INDEX "MarketplaceItem_isActive_idx" ON "MarketplaceItem"("isActive");

-- CreateIndex
CREATE INDEX "WorkspaceEntitlement_personalSpaceId_idx" ON "WorkspaceEntitlement"("personalSpaceId");

-- CreateIndex
CREATE INDEX "WorkspaceEntitlement_companyId_idx" ON "WorkspaceEntitlement"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEntitlement_itemId_personalSpaceId_key" ON "WorkspaceEntitlement"("itemId", "personalSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEntitlement_itemId_companyId_key" ON "WorkspaceEntitlement"("itemId", "companyId");

-- CreateIndex
CREATE INDEX "WorkspaceFolder_personalSpaceId_idx" ON "WorkspaceFolder"("personalSpaceId");

-- CreateIndex
CREATE INDEX "WorkspaceFolder_companyId_idx" ON "WorkspaceFolder"("companyId");

-- CreateIndex
CREATE INDEX "WorkspaceFolder_parentId_idx" ON "WorkspaceFolder"("parentId");

-- CreateIndex
CREATE INDEX "WorkspaceFile_personalSpaceId_idx" ON "WorkspaceFile"("personalSpaceId");

-- CreateIndex
CREATE INDEX "WorkspaceFile_companyId_idx" ON "WorkspaceFile"("companyId");

-- CreateIndex
CREATE INDEX "WorkspaceFile_folderId_idx" ON "WorkspaceFile"("folderId");

-- CreateIndex
CREATE INDEX "Project_personalSpaceId_idx" ON "Project"("personalSpaceId");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- AddForeignKey
ALTER TABLE "PersonalSpace" ADD CONSTRAINT "PersonalSpace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalCreditBalance" ADD CONSTRAINT "PersonalCreditBalance_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceEntitlement" ADD CONSTRAINT "WorkspaceEntitlement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketplaceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceEntitlement" ADD CONSTRAINT "WorkspaceEntitlement_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceEntitlement" ADD CONSTRAINT "WorkspaceEntitlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFolder" ADD CONSTRAINT "WorkspaceFolder_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFolder" ADD CONSTRAINT "WorkspaceFolder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFolder" ADD CONSTRAINT "WorkspaceFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkspaceFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WorkspaceFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_personalSpaceId_fkey" FOREIGN KEY ("personalSpaceId") REFERENCES "PersonalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
