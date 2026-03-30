-- CreateEnum
CREATE TYPE "TrendTimeUnit" AS ENUM ('date', 'week', 'month');

-- CreateEnum
CREATE TYPE "TrendProfileStatus" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "TrendCollectionRunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "TrendCollectionTaskStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "TrendSyncStatus" AS ENUM ('idle', 'syncing', 'synced', 'failed');

-- CreateTable
CREATE TABLE "TrendProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryCid" INTEGER NOT NULL,
    "categoryPath" TEXT NOT NULL,
    "categoryDepth" INTEGER NOT NULL,
    "timeUnit" "TrendTimeUnit" NOT NULL DEFAULT 'month',
    "devices" TEXT[],
    "genders" TEXT[],
    "ages" TEXT[],
    "spreadsheetId" TEXT NOT NULL,
    "status" "TrendProfileStatus" NOT NULL DEFAULT 'active',
    "startPeriod" TEXT NOT NULL,
    "endPeriod" TEXT NOT NULL,
    "lastCollectedPeriod" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "TrendSyncStatus" NOT NULL DEFAULT 'idle',
    "latestRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendCollectionRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "TrendCollectionRunStatus" NOT NULL DEFAULT 'queued',
    "requestedBy" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "startPeriod" TEXT NOT NULL,
    "endPeriod" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "failedTasks" INTEGER NOT NULL DEFAULT 0,
    "totalSnapshots" INTEGER NOT NULL DEFAULT 0,
    "sheetUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendCollectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendCollectionTask" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "TrendCollectionTaskStatus" NOT NULL DEFAULT 'pending',
    "completedPages" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "failureSnippet" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendCollectionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendKeywordSnapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "categoryCid" INTEGER NOT NULL,
    "categoryPath" TEXT NOT NULL,
    "devices" TEXT[],
    "genders" TEXT[],
    "ages" TEXT[],
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendKeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrendProfile_slug_key" ON "TrendProfile"("slug");

-- CreateIndex
CREATE INDEX "TrendProfile_status_updatedAt_idx" ON "TrendProfile"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrendCollectionRun_profileId_status_updatedAt_idx" ON "TrendCollectionRun"("profileId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "TrendCollectionTask_runId_status_period_idx" ON "TrendCollectionTask"("runId", "status", "period");

-- CreateIndex
CREATE INDEX "TrendCollectionTask_profileId_period_idx" ON "TrendCollectionTask"("profileId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TrendKeywordSnapshot_profileId_period_rank_key" ON "TrendKeywordSnapshot"("profileId", "period", "rank");

-- CreateIndex
CREATE INDEX "TrendKeywordSnapshot_runId_period_idx" ON "TrendKeywordSnapshot"("runId", "period");

-- CreateIndex
CREATE INDEX "TrendKeywordSnapshot_profileId_collectedAt_idx" ON "TrendKeywordSnapshot"("profileId", "collectedAt");

-- AddForeignKey
ALTER TABLE "TrendCollectionRun" ADD CONSTRAINT "TrendCollectionRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TrendProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendCollectionTask" ADD CONSTRAINT "TrendCollectionTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TrendCollectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendCollectionTask" ADD CONSTRAINT "TrendCollectionTask_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TrendProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendKeywordSnapshot" ADD CONSTRAINT "TrendKeywordSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TrendProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendKeywordSnapshot" ADD CONSTRAINT "TrendKeywordSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TrendCollectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendKeywordSnapshot" ADD CONSTRAINT "TrendKeywordSnapshot_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrendCollectionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
