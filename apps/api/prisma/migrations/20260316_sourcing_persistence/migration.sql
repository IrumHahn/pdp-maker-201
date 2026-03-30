-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('openai', 'gemini', 'claude');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('url', 'file', 'text');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('queued', 'processing', 'indexed', 'failed');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'answered');

-- CreateEnum
CREATE TYPE "SourcingIntakeMode" AS ENUM ('explore_anything', 'focus_category');

-- CreateEnum
CREATE TYPE "PreferenceLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "HotTrack" AS ENUM ('BURST', 'STEADY', 'EMERGING');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "SourcingRunStatus" AS ENUM ('queued', 'searching', 'merchandising', 'localizing', 'sourcing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "KoreaTrendState" AS ENUM ('initial_estimate', 'tracked');

-- CreateEnum
CREATE TYPE "SupplierSourceSite" AS ENUM ('Alibaba', 'site_1688', 'global_sources');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'queued',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptSetting" (
    "id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "promptText" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryTicket" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingIntake" (
    "id" TEXT NOT NULL,
    "mode" "SourcingIntakeMode" NOT NULL,
    "interests" TEXT[],
    "excludedCategories" TEXT[],
    "targetPriceBand" TEXT NOT NULL,
    "targetMarginPercent" INTEGER NOT NULL,
    "shippingSensitivity" "PreferenceLevel" NOT NULL,
    "regulationSensitivity" "PreferenceLevel" NOT NULL,
    "sourcingCountries" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "status" "SourcingRunStatus" NOT NULL DEFAULT 'queued',
    "stageLabel" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "localizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "track" "HotTrack" NOT NULL,
    "whyHot" TEXT NOT NULL,
    "targetCustomer" TEXT NOT NULL,
    "koreanAngle" TEXT NOT NULL,
    "whoShouldSell" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskLabels" TEXT[],
    "demandScore" INTEGER NOT NULL,
    "trendScore" INTEGER NOT NULL,
    "koreaFitScore" INTEGER NOT NULL,
    "sourcingEaseScore" INTEGER NOT NULL,
    "riskAdjustedScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "localMarketStatus" "KoreaTrendState",
    "supplierStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvidence" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "metricValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KoreaMarketSnapshot" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "KoreaTrendState" NOT NULL,
    "priceMinKrw" INTEGER NOT NULL,
    "priceMedianKrw" INTEGER NOT NULL,
    "priceMaxKrw" INTEGER NOT NULL,
    "sellerDensity" TEXT NOT NULL,
    "reviewDensity" TEXT NOT NULL,
    "searchInterest" TEXT NOT NULL,
    "competitionSummary" TEXT NOT NULL,
    "trendSummary" TEXT NOT NULL,
    "riskSummary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KoreaMarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLead" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceSite" "SupplierSourceSite" NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierCountry" TEXT NOT NULL,
    "moq" TEXT NOT NULL,
    "unitPriceRange" TEXT NOT NULL,
    "leadTime" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "contactNote" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "searchUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "supplierLeadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checklist" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSource_status_idx" ON "KnowledgeSource"("status");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_sourceId_idx" ON "KnowledgeChunk"("sourceId");

-- CreateIndex
CREATE INDEX "InquiryTicket_status_createdAt_idx" ON "InquiryTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_intakeId_status_idx" ON "DiscoveryRun"("intakeId", "status");

-- CreateIndex
CREATE INDEX "ProductCandidate_runId_overallScore_idx" ON "ProductCandidate"("runId", "overallScore");

-- CreateIndex
CREATE INDEX "ProductEvidence_candidateId_idx" ON "ProductEvidence"("candidateId");

-- CreateIndex
CREATE INDEX "KoreaMarketSnapshot_candidateId_collectedAt_idx" ON "KoreaMarketSnapshot"("candidateId", "collectedAt");

-- CreateIndex
CREATE INDEX "SupplierLead_candidateId_sourceSite_idx" ON "SupplierLead"("candidateId", "sourceSite");

-- CreateIndex
CREATE INDEX "OutreachDraft_candidateId_createdAt_idx" ON "OutreachDraft"("candidateId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InquiryTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "SourcingIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCandidate" ADD CONSTRAINT "ProductCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvidence" ADD CONSTRAINT "ProductEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProductCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KoreaMarketSnapshot" ADD CONSTRAINT "KoreaMarketSnapshot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProductCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLead" ADD CONSTRAINT "SupplierLead_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProductCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProductCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_supplierLeadId_fkey" FOREIGN KEY ("supplierLeadId") REFERENCES "SupplierLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

