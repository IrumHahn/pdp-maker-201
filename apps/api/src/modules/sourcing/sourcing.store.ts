import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  TrendCollectionRun,
  TrendCollectionTask,
  TrendKeywordSnapshot,
  TrendProfile
} from "@runacademy/shared";
import {
  SOURCING_STAGE_LABELS,
  SOURCING_STAGE_ORDER,
  type AgentTask,
  type MailboxConnection,
  type DiscoveryRun,
  type NegotiationExtractedTerms,
  type ProductCandidate,
  type RunStageSnapshot,
  type SourcingIntake
} from "./sourcing.types";

interface SourcingStoreData {
  users: Array<{
    id: string;
    email: string;
    name: string;
  }>;
  intakes: SourcingIntake[];
  runs: DiscoveryRun[];
  tasks: AgentTask[];
  candidates: ProductCandidate[];
  mailboxConnections: MailboxConnection[];
  mailboxSecrets: Record<
    string,
    {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
    }
  >;
  trendProfiles: TrendProfile[];
  trendRuns: TrendCollectionRun[];
  trendTasks: TrendCollectionTask[];
  trendSnapshots: TrendKeywordSnapshot[];
}

interface SourcingStoreOptions {
  storePath?: string;
}

const emptyStore = (): SourcingStoreData => ({
  users: [
    {
      id: "demo-user",
      email: "demo@haniroom.ai",
      name: "한이룸 데모 사용자"
    }
  ],
  intakes: [],
  runs: [],
  tasks: [],
  candidates: [],
  mailboxConnections: [],
  mailboxSecrets: {},
  trendProfiles: [],
  trendRuns: [],
  trendTasks: [],
  trendSnapshots: []
});

function normalizeStoreData(value: unknown): SourcingStoreData {
  const seed = emptyStore();

  if (!value || typeof value !== "object") {
    return seed;
  }

  const record = value as Partial<SourcingStoreData>;

  return {
    users: Array.isArray(record.users) && record.users.length ? record.users : seed.users,
    intakes: Array.isArray(record.intakes) ? record.intakes : seed.intakes,
    runs: Array.isArray(record.runs) ? record.runs : seed.runs,
    tasks: Array.isArray(record.tasks) ? record.tasks : seed.tasks,
    candidates: Array.isArray(record.candidates) ? record.candidates : seed.candidates,
    mailboxConnections: Array.isArray(record.mailboxConnections) ? record.mailboxConnections : seed.mailboxConnections,
    mailboxSecrets:
      record.mailboxSecrets && typeof record.mailboxSecrets === "object" ? record.mailboxSecrets : seed.mailboxSecrets,
    trendProfiles: Array.isArray(record.trendProfiles) ? record.trendProfiles : seed.trendProfiles,
    trendRuns: Array.isArray(record.trendRuns) ? record.trendRuns : seed.trendRuns,
    trendTasks: Array.isArray(record.trendTasks) ? record.trendTasks : seed.trendTasks,
    trendSnapshots: Array.isArray(record.trendSnapshots) ? record.trendSnapshots : seed.trendSnapshots
  };
}

@Injectable()
export class SourcingStoreService {
  private readonly storePath: string;
  private cache: SourcingStoreData | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private prismaMode: "unknown" | "enabled" | "disabled" = "unknown";

  constructor(
    private readonly prisma?: PrismaService,
    options: SourcingStoreOptions = {}
  ) {
    this.storePath = options.storePath ?? resolve(__dirname, "../../../.local/sourcing-store.json");
  }

  async read<T>(reader: (data: SourcingStoreData) => T | Promise<T>) {
    const data = structuredClone(await this.load());
    return reader(data);
  }

  async mutate<T>(mutator: (data: SourcingStoreData) => T | Promise<T>) {
    const task = this.writeQueue.then(async () => {
      const data = await this.load();
      const result = await mutator(data);
      await this.persist(data);
      return result;
    });

    this.writeQueue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  private async load() {
    if (this.cache) {
      return this.cache;
    }

    if (await this.canUsePrisma()) {
      try {
        const prismaData = await this.loadFromPrisma();

        if (hasPersistedData(prismaData)) {
          this.cache = prismaData;
          return prismaData;
        }

        const fileData = await this.loadFromFile();
        if (hasPersistedData(fileData)) {
          await this.persistToPrisma(fileData);
          this.cache = fileData;
          return fileData;
        }

        this.cache = prismaData;
        return prismaData;
      } catch (error) {
        console.warn("[sourcing-store] prisma load failed, using file fallback", error);
        this.prismaMode = "disabled";
      }
    }

    const fileData = await this.loadFromFile();
    this.cache = fileData;
    return fileData;
  }

  private async persist(data: SourcingStoreData) {
    this.cache = data;

    if (await this.canUsePrisma()) {
      try {
        await this.persistToPrisma(data);
      } catch (error) {
        console.warn("[sourcing-store] prisma persist failed, file backup only", error);
        this.prismaMode = "disabled";
      }
    }

    await this.persistToFile(data);
  }

  private async canUsePrisma() {
    if (!this.prisma) {
      return false;
    }

    if (this.prismaMode === "enabled") {
      return true;
    }

    if (this.prismaMode === "disabled") {
      return false;
    }

    try {
      await this.prisma.$connect();
      this.prismaMode = "enabled";
      return true;
    } catch (error) {
      console.warn("[sourcing-store] prisma unavailable", error);
      this.prismaMode = "disabled";
      return false;
    }
  }

  private async loadFromFile() {
    if (!existsSync(this.storePath)) {
      return emptyStore();
    }

    try {
      const raw = await readFile(this.storePath, "utf8");
      return normalizeStoreData(JSON.parse(raw));
    } catch {
      return emptyStore();
    }
  }

  private async persistToFile(data: SourcingStoreData) {
    await mkdir(resolve(this.storePath, ".."), { recursive: true });
    await writeFile(this.storePath, JSON.stringify(data, null, 2), "utf8");
  }

  private async loadFromPrisma() {
    const prisma = this.prisma!;
    const [users, intakes, runs, tasks, mailboxConnections, candidates, trendProfiles, trendRuns, trendTasks, trendSnapshots] =
      await prisma.$transaction([
      prisma.user.findMany({
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.sourcingIntake.findMany({
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.discoveryRun.findMany({
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.agentTask.findMany(),
      prisma.mailboxConnection.findMany(),
      prisma.productCandidate.findMany({
        include: {
          evidences: true,
          competitionReport: true,
          supplierLeads: true,
          negotiationThreads: {
            include: {
              drafts: {
                orderBy: {
                  createdAt: "desc"
                }
              },
              messages: {
                orderBy: {
                  createdAt: "desc"
                }
              },
              approvals: {
                orderBy: {
                  createdAt: "desc"
                }
              }
            },
            orderBy: {
              updatedAt: "desc"
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.trendProfile.findMany({
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.trendCollectionRun.findMany({
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.trendCollectionTask.findMany({
        orderBy: {
          updatedAt: "asc"
        }
      }),
      prisma.trendKeywordSnapshot.findMany({
        orderBy: [
          {
            period: "asc"
          },
          {
            rank: "asc"
          }
        ]
      })
    ]);

    const snapshot: SourcingStoreData = {
      users:
        users.length > 0
          ? users.map((user) => ({
              id: user.id,
              email: user.email,
              name: user.name ?? user.email
            }))
          : emptyStore().users,
      intakes: intakes.map((item) => ({
        id: item.id,
        userId: item.userId,
        mode: item.mode,
        interests: item.interests,
        excludedCategories: item.excludedCategories,
        targetPriceBand: item.targetPriceBand,
        targetMarginPercent: item.targetMarginPercent,
        shippingSensitivity: item.shippingSensitivity,
        regulationSensitivity: item.regulationSensitivity,
        sourcingCountries: item.sourcingCountries,
        notes: item.notes ?? undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })),
      runs: runs.map((run) => ({
        id: run.id,
        intakeId: run.intakeId,
        userId: intakes.find((item) => item.id === run.intakeId)?.userId ?? "demo-user",
        status: run.status,
        currentStage: run.currentStage,
        stageLabel: run.stageLabel,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
        completedAt: run.completedAt?.toISOString(),
        summary: run.summary ?? undefined,
        candidateIds: [],
        candidateCount: run.candidateCount,
        stages: buildRunStages(run.currentStage, run.status)
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        runId: task.runId,
        stage: task.stage,
        agent: task.agent,
        status: task.status,
        title: task.title,
        summary: task.summary,
        inputSummary: task.inputSummary ?? undefined,
        outputSummary: task.outputSummary ?? undefined,
        retries: task.retries,
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        errorMessage: task.errorMessage ?? undefined
      })),
      candidates: candidates.map((candidate) => mapCandidateFromPrisma(candidate)),
      mailboxConnections: mailboxConnections.map((connection) => ({
        id: connection.id,
        userId: connection.userId,
        provider: connection.provider,
        status: connection.status,
        email: connection.email ?? undefined,
        displayName: connection.displayName ?? undefined,
        scope: connection.scope,
        authUrl: connection.authUrl ?? undefined,
        connectedAt: connection.connectedAt?.toISOString(),
        lastSyncedAt: connection.lastSyncedAt?.toISOString(),
        isMock: connection.isMock
      })),
      mailboxSecrets: Object.fromEntries(
        mailboxConnections
          .filter((connection) => connection.accessTokenEncrypted || connection.refreshTokenEncrypted || connection.expiresAt)
          .map((connection) => [
            connection.id,
            {
              accessToken: connection.accessTokenEncrypted ?? undefined,
              refreshToken: connection.refreshTokenEncrypted ?? undefined,
              expiresAt: connection.expiresAt?.toISOString()
            }
          ])
      ),
      trendProfiles: trendProfiles.map((profile) => ({
        id: profile.id,
        slug: profile.slug,
        name: profile.name,
        categoryCid: profile.categoryCid,
        categoryPath: profile.categoryPath,
        categoryDepth: profile.categoryDepth,
        timeUnit: profile.timeUnit,
        devices: profile.devices as TrendProfile["devices"],
        genders: profile.genders as TrendProfile["genders"],
        ages: profile.ages as TrendProfile["ages"],
        spreadsheetId: profile.spreadsheetId,
        status: profile.status,
        startPeriod: profile.startPeriod,
        endPeriod: profile.endPeriod,
        lastCollectedPeriod: profile.lastCollectedPeriod ?? undefined,
        lastSyncedAt: profile.lastSyncedAt?.toISOString(),
        syncStatus: profile.syncStatus,
        latestRunId: profile.latestRunId ?? undefined,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      })),
      trendRuns: trendRuns.map((run) => ({
        id: run.id,
        profileId: run.profileId,
        status: run.status,
        requestedBy: run.requestedBy,
        runType: "backfill",
        startPeriod: run.startPeriod,
        endPeriod: run.endPeriod,
        totalTasks: run.totalTasks,
        completedTasks: run.completedTasks,
        failedTasks: run.failedTasks,
        totalSnapshots: run.totalSnapshots,
        sheetUrl: run.sheetUrl ?? undefined,
        startedAt: run.startedAt?.toISOString(),
        completedAt: run.completedAt?.toISOString(),
        failureReason: run.failureReason ?? undefined,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString()
      })),
      trendTasks: trendTasks.map((task) => ({
        id: task.id,
        runId: task.runId,
        profileId: task.profileId,
        period: task.period,
        status: task.status,
        completedPages: task.completedPages,
        totalPages: task.totalPages,
        retryCount: task.retryCount,
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        failureReason: task.failureReason ?? undefined,
        failureSnippet: task.failureSnippet ?? undefined,
        updatedAt: task.updatedAt.toISOString()
      })),
      trendSnapshots: trendSnapshots.map((snapshot) => ({
        id: snapshot.id,
        profileId: snapshot.profileId,
        runId: snapshot.runId,
        taskId: snapshot.taskId,
        period: snapshot.period,
        rank: snapshot.rank,
        keyword: snapshot.keyword,
        linkId: snapshot.linkId,
        categoryCid: snapshot.categoryCid,
        categoryPath: snapshot.categoryPath,
        devices: snapshot.devices as TrendKeywordSnapshot["devices"],
        genders: snapshot.genders as TrendKeywordSnapshot["genders"],
        ages: snapshot.ages as TrendKeywordSnapshot["ages"],
        collectedAt: snapshot.collectedAt.toISOString()
      }))
    };

    return snapshot;
  }

  private async persistToPrisma(data: SourcingStoreData) {
    const prisma = this.prisma!;

    await prisma.$transaction(async (tx) => {
      for (const user of data.users) {
        await tx.user.upsert({
          where: {
            id: user.id
          },
          update: {
            email: user.email,
            name: user.name
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      }

      await tx.approvalRequest.deleteMany();
      await tx.negotiationMessage.deleteMany();
      await tx.negotiationDraft.deleteMany();
      await tx.negotiationThread.deleteMany();
      await tx.supplierLead.deleteMany();
      await tx.competitionReport.deleteMany();
      await tx.candidateEvidence.deleteMany();
      await tx.productCandidate.deleteMany();
      await tx.agentTask.deleteMany();
      await tx.discoveryRun.deleteMany();
      await tx.sourcingIntake.deleteMany();
      await tx.mailboxConnection.deleteMany();
      await tx.trendKeywordSnapshot.deleteMany();
      await tx.trendCollectionTask.deleteMany();
      await tx.trendCollectionRun.deleteMany();
      await tx.trendProfile.deleteMany();

      if (data.mailboxConnections.length) {
        await tx.mailboxConnection.createMany({
          data: data.mailboxConnections.map((connection) => ({
            id: connection.id,
            userId: connection.userId,
            provider: connection.provider,
            status: connection.status,
            email: connection.email ?? null,
            displayName: connection.displayName ?? null,
            scope: connection.scope,
            authUrl: connection.authUrl ?? null,
            connectedAt: toDate(connection.connectedAt),
            lastSyncedAt: toDate(connection.lastSyncedAt),
            isMock: connection.isMock,
            accessTokenEncrypted: data.mailboxSecrets[connection.id]?.accessToken ?? null,
            refreshTokenEncrypted: data.mailboxSecrets[connection.id]?.refreshToken ?? null,
            expiresAt: toDate(data.mailboxSecrets[connection.id]?.expiresAt)
          }))
        });
      }

      if (data.intakes.length) {
        await tx.sourcingIntake.createMany({
          data: data.intakes.map((intake) => ({
            id: intake.id,
            userId: intake.userId,
            mode: intake.mode,
            interests: intake.interests,
            excludedCategories: intake.excludedCategories,
            targetPriceBand: intake.targetPriceBand,
            targetMarginPercent: intake.targetMarginPercent,
            shippingSensitivity: intake.shippingSensitivity,
            regulationSensitivity: intake.regulationSensitivity,
            sourcingCountries: intake.sourcingCountries,
            notes: intake.notes ?? null,
            createdAt: toRequiredDate(intake.createdAt),
            updatedAt: toDate(intake.updatedAt) ?? new Date()
          }))
        });
      }

      if (data.trendProfiles.length) {
        await tx.trendProfile.createMany({
          data: data.trendProfiles.map((profile) => ({
            id: profile.id,
            slug: profile.slug,
            name: profile.name,
            categoryCid: profile.categoryCid,
            categoryPath: profile.categoryPath,
            categoryDepth: profile.categoryDepth,
            timeUnit: profile.timeUnit,
            devices: profile.devices,
            genders: profile.genders,
            ages: profile.ages,
            spreadsheetId: profile.spreadsheetId,
            status: profile.status,
            startPeriod: profile.startPeriod,
            endPeriod: profile.endPeriod,
            lastCollectedPeriod: profile.lastCollectedPeriod ?? null,
            lastSyncedAt: toDate(profile.lastSyncedAt),
            syncStatus: profile.syncStatus,
            latestRunId: profile.latestRunId ?? null,
            createdAt: toRequiredDate(profile.createdAt),
            updatedAt: toDate(profile.updatedAt) ?? new Date()
          }))
        });
      }

      if (data.trendRuns.length) {
        await tx.trendCollectionRun.createMany({
          data: data.trendRuns.map((run) => ({
            id: run.id,
            profileId: run.profileId,
            status: run.status,
            requestedBy: run.requestedBy,
            runType: run.runType,
            startPeriod: run.startPeriod,
            endPeriod: run.endPeriod,
            totalTasks: run.totalTasks,
            completedTasks: run.completedTasks,
            failedTasks: run.failedTasks,
            totalSnapshots: run.totalSnapshots,
            sheetUrl: run.sheetUrl ?? null,
            startedAt: toDate(run.startedAt),
            completedAt: toDate(run.completedAt),
            failureReason: run.failureReason ?? null,
            createdAt: toRequiredDate(run.createdAt),
            updatedAt: toDate(run.updatedAt) ?? new Date()
          }))
        });
      }

      if (data.trendTasks.length) {
        await tx.trendCollectionTask.createMany({
          data: data.trendTasks.map((task) => ({
            id: task.id,
            runId: task.runId,
            profileId: task.profileId,
            period: task.period,
            status: task.status,
            completedPages: task.completedPages,
            totalPages: task.totalPages,
            retryCount: task.retryCount,
            startedAt: toDate(task.startedAt),
            completedAt: toDate(task.completedAt),
            failureReason: task.failureReason ?? null,
            failureSnippet: task.failureSnippet ?? null,
            updatedAt: toDate(task.updatedAt) ?? new Date()
          }))
        });
      }

      if (data.trendSnapshots.length) {
        await tx.trendKeywordSnapshot.createMany({
          data: data.trendSnapshots.map((snapshot) => ({
            id: snapshot.id,
            profileId: snapshot.profileId,
            runId: snapshot.runId,
            taskId: snapshot.taskId,
            period: snapshot.period,
            rank: snapshot.rank,
            keyword: snapshot.keyword,
            linkId: snapshot.linkId,
            categoryCid: snapshot.categoryCid,
            categoryPath: snapshot.categoryPath,
            devices: snapshot.devices,
            genders: snapshot.genders,
            ages: snapshot.ages,
            collectedAt: toDate(snapshot.collectedAt) ?? new Date()
          }))
        });
      }

      if (data.runs.length) {
        await tx.discoveryRun.createMany({
          data: data.runs.map((run) => ({
            id: run.id,
            intakeId: run.intakeId,
            status: run.status,
            currentStage: run.currentStage,
            stageLabel: run.stageLabel,
            summary: run.summary ?? null,
            candidateCount: run.candidateCount,
            createdAt: toRequiredDate(run.createdAt),
            updatedAt: toDate(run.updatedAt) ?? new Date(),
            completedAt: toDate(run.completedAt)
          }))
        });
      }

      if (data.tasks.length) {
        await tx.agentTask.createMany({
          data: data.tasks.map((task) => ({
            id: task.id,
            runId: task.runId,
            stage: task.stage,
            agent: task.agent,
            status: task.status,
            title: task.title,
            summary: task.summary,
            inputSummary: task.inputSummary ?? null,
            outputSummary: task.outputSummary ?? null,
            retries: task.retries,
            errorMessage: task.errorMessage ?? null,
            startedAt: toDate(task.startedAt),
            completedAt: toDate(task.completedAt)
          }))
        });
      }

      if (data.candidates.length) {
        await tx.productCandidate.createMany({
          data: data.candidates.map((candidate) => ({
            id: candidate.id,
            runId: candidate.runId,
            canonicalName: candidate.canonicalName,
            localizedName: candidate.localizedName,
            category: candidate.category,
            track: candidate.track,
            whyHot: candidate.whyHot,
            targetCustomer: candidate.targetCustomer,
            koreanAngle: candidate.koreanAngle,
            riskLevel: candidate.riskLevel,
            riskLabels: candidate.riskLabels,
            demandScore: candidate.scores.demandScore,
            trendScore: candidate.scores.trendScore,
            koreaFitScore: candidate.scores.koreaFitScore,
            sourcingEaseScore: candidate.scores.sourcingEaseScore,
            riskAdjustedScore: candidate.scores.riskAdjustedScore,
            overallScore: candidate.scores.overallScore,
            evidenceCount: candidate.evidenceCount,
            opportunityType: candidate.opportunityType,
            opportunityTitle: candidate.opportunityTitle,
            globalPopularityLabel: candidate.globalPopularityLabel,
            hiddenOpportunityLabel: candidate.hiddenOpportunityLabel,
            koreaCompetitionLabel: candidate.koreaCompetitionLabel,
            estimatedMarginPercent: candidate.estimatedMarginPercent,
            evaluationReasons: candidate.evaluationReasons,
            competitionStatus: candidate.competitionStatus,
            supplierStatus: candidate.supplierStatus,
            whoShouldSell: candidate.whoShouldSell,
            notes: candidate.notes,
            recommendedActions: candidate.recommendedActions
          }))
        });

        const evidenceRows = data.candidates.flatMap((candidate) =>
          candidate.evidence.map((evidence) => ({
            id: evidence.id,
            candidateId: candidate.id,
            sourceName: evidence.sourceName,
            sourceType: evidence.sourceType,
            sourceUrl: evidence.sourceUrl,
            summary: evidence.summary,
            metricLabel: evidence.metricLabel,
            metricValue: evidence.metricValue,
            confidence: evidence.confidence,
            capturedAt: toDate(evidence.capturedAt) ?? new Date()
          }))
        );

        if (evidenceRows.length) {
          await tx.candidateEvidence.createMany({
            data: evidenceRows
          });
        }

        const competitionRows = data.candidates
          .filter((candidate) => candidate.competitionReport)
          .map((candidate) => ({
            id: candidate.competitionReport!.id,
            candidateId: candidate.id,
            status: candidate.competitionReport!.status,
            source: candidate.competitionReport!.source,
            keyword: candidate.competitionReport!.keyword,
            priceMinKrw: candidate.competitionReport!.priceMinKrw,
            priceMedianKrw: candidate.competitionReport!.priceMedianKrw,
            priceMaxKrw: candidate.competitionReport!.priceMaxKrw,
            sellerDensity: candidate.competitionReport!.sellerDensity,
            reviewDensity: candidate.competitionReport!.reviewDensity,
            searchInterest: candidate.competitionReport!.searchInterest,
            competitionLevel: candidate.competitionReport!.competitionLevel,
            competitionSummary: candidate.competitionReport!.competitionSummary,
            insightSummary: candidate.competitionReport!.insightSummary,
            riskSummary: candidate.competitionReport!.riskSummary,
            differentiationIdeas: candidate.competitionReport!.differentiationIdeas,
            confidence: candidate.competitionReport!.confidence,
            collectedAt: toDate(candidate.competitionReport!.collectedAt) ?? new Date()
          }));

        if (competitionRows.length) {
          await tx.competitionReport.createMany({
            data: competitionRows
          });
        }

        const supplierRows = data.candidates.flatMap((candidate) =>
          candidate.supplierLeads.map((lead) => ({
            id: lead.id,
            candidateId: candidate.id,
            sourceSite: toPrismaSupplierSourceSite(lead.sourceSite),
            supplierName: lead.supplierName,
            supplierCountry: lead.supplierCountry,
            moq: lead.moq,
            unitPriceRange: lead.unitPriceRange,
            leadTime: lead.leadTime,
            confidence: lead.confidence,
            contactNote: lead.contactNote,
            riskLevel: lead.riskLevel,
            searchUrl: lead.searchUrl,
            sampleAvailable: lead.sampleAvailable,
            oemAvailable: lead.oemAvailable,
            capabilitySummary: lead.capabilitySummary,
            contactEmail: lead.contactEmail ?? null
          }))
        );

        if (supplierRows.length) {
          await tx.supplierLead.createMany({
            data: supplierRows
          });
        }

        const threadRows = data.candidates.flatMap((candidate) =>
          candidate.negotiationThreads.map((thread) => ({
            id: thread.id,
            candidateId: thread.candidateId,
            supplierLeadId: thread.supplierLeadId,
            mailboxConnectionId: thread.mailboxConnectionId ?? null,
            status: thread.status,
            summary: thread.summary,
            nextRecommendedAction: thread.nextRecommendedAction,
            targetUnitPriceUsd: thread.guardrails.targetUnitPriceUsd,
            maxMoq: thread.guardrails.maxMoq,
            askSample: thread.guardrails.askSample,
            desiredIncoterm: thread.guardrails.desiredIncoterm,
            bannedPhrases: thread.guardrails.bannedPhrases,
            createdAt: toDate(thread.createdAt) ?? new Date(),
            updatedAt: toDate(thread.updatedAt) ?? new Date()
          }))
        );

        if (threadRows.length) {
          await tx.negotiationThread.createMany({
            data: threadRows
          });
        }

        const draftRows = data.candidates.flatMap((candidate) =>
          candidate.negotiationThreads.flatMap((thread) =>
            thread.latestDraft
              ? [
                  {
                    id: thread.latestDraft.id,
                    threadId: thread.id,
                    candidateId: thread.latestDraft.candidateId,
                    supplierLeadId: thread.latestDraft.supplierLeadId,
                    subject: thread.latestDraft.subject,
                    body: thread.latestDraft.body,
                    checklist: thread.latestDraft.checklist,
                    status: thread.latestDraft.status,
                    createdAt: toDate(thread.latestDraft.createdAt) ?? new Date()
                  }
                ]
              : []
          )
        );

        if (draftRows.length) {
          await tx.negotiationDraft.createMany({
            data: draftRows
          });
        }

        const messageRows = data.candidates.flatMap((candidate) =>
          candidate.negotiationThreads.flatMap((thread) =>
            thread.messages.map((message) => ({
              id: message.id,
              threadId: thread.id,
              direction: message.direction,
              subject: message.subject,
              body: message.body,
              summary: message.summary,
              extractedTerms: message.extractedTerms
                ? (message.extractedTerms as unknown as Prisma.InputJsonValue)
                : undefined,
              createdAt: toDate(message.createdAt) ?? new Date()
            }))
          )
        );

        if (messageRows.length) {
          await tx.negotiationMessage.createMany({
            data: messageRows
          });
        }

        const approvalRows = data.candidates.flatMap((candidate) =>
          candidate.negotiationThreads.flatMap((thread) =>
            thread.pendingApproval
              ? [
                  {
                    id: thread.pendingApproval.id,
                    threadId: thread.id,
                    draftId: thread.pendingApproval.draftId,
                    status: thread.pendingApproval.status,
                    createdAt: toDate(thread.pendingApproval.createdAt) ?? new Date(),
                    decidedAt: toDate(thread.pendingApproval.decidedAt)
                  }
                ]
              : []
          )
        );

        if (approvalRows.length) {
          await tx.approvalRequest.createMany({
            data: approvalRows
          });
        }
      }
    });
  }
}

function hasPersistedData(data: SourcingStoreData) {
  return (
    data.intakes.length > 0 ||
    data.runs.length > 0 ||
    data.candidates.length > 0 ||
    data.mailboxConnections.length > 0 ||
    Object.keys(data.mailboxSecrets).length > 0 ||
    data.trendProfiles.length > 0 ||
    data.trendRuns.length > 0 ||
    data.trendTasks.length > 0 ||
    data.trendSnapshots.length > 0
  );
}

function mapCandidateFromPrisma(candidate: any): ProductCandidate {
  return {
    id: candidate.id,
    runId: candidate.runId,
    canonicalName: candidate.canonicalName,
    localizedName: candidate.localizedName,
    category: candidate.category,
    track: candidate.track,
    whyHot: candidate.whyHot,
    targetCustomer: candidate.targetCustomer,
    koreanAngle: candidate.koreanAngle,
    riskLevel: candidate.riskLevel,
    riskLabels: candidate.riskLabels,
    scores: {
      demandScore: candidate.demandScore,
      trendScore: candidate.trendScore,
      koreaFitScore: candidate.koreaFitScore,
      sourcingEaseScore: candidate.sourcingEaseScore,
      riskAdjustedScore: candidate.riskAdjustedScore,
      overallScore: candidate.overallScore
    },
    evidenceCount: candidate.evidenceCount,
    opportunityType: candidate.opportunityType,
    opportunityTitle: candidate.opportunityTitle,
    globalPopularityLabel: candidate.globalPopularityLabel,
    hiddenOpportunityLabel: candidate.hiddenOpportunityLabel,
    koreaCompetitionLabel: candidate.koreaCompetitionLabel,
    estimatedMarginPercent: candidate.estimatedMarginPercent,
    evaluationReasons: candidate.evaluationReasons,
    competitionStatus: candidate.competitionStatus,
    supplierStatus: candidate.supplierStatus,
    whoShouldSell: candidate.whoShouldSell,
    notes: candidate.notes,
    recommendedActions: candidate.recommendedActions,
    evidence: (candidate.evidences ?? []).map((evidence: any) => ({
      id: evidence.id,
      sourceName: evidence.sourceName,
      sourceType: evidence.sourceType,
      sourceUrl: evidence.sourceUrl,
      summary: evidence.summary,
      metricLabel: evidence.metricLabel,
      metricValue: evidence.metricValue,
      confidence: evidence.confidence,
      capturedAt: evidence.capturedAt.toISOString()
    })),
    supplierSearchLinks: buildSupplierSearchLinks(candidate.canonicalName),
    competitionReport: candidate.competitionReport
      ? {
          id: candidate.competitionReport.id,
          candidateId: candidate.competitionReport.candidateId,
          status: candidate.competitionReport.status,
          source: candidate.competitionReport.source as "naver_api" | "manual_snapshot" | "estimate",
          keyword: candidate.competitionReport.keyword,
          priceMinKrw: candidate.competitionReport.priceMinKrw,
          priceMedianKrw: candidate.competitionReport.priceMedianKrw,
          priceMaxKrw: candidate.competitionReport.priceMaxKrw,
          sellerDensity: candidate.competitionReport.sellerDensity,
          reviewDensity: candidate.competitionReport.reviewDensity,
          searchInterest: candidate.competitionReport.searchInterest,
          competitionLevel: candidate.competitionReport.competitionLevel,
          competitionSummary: candidate.competitionReport.competitionSummary,
          insightSummary: candidate.competitionReport.insightSummary,
          riskSummary: candidate.competitionReport.riskSummary,
          differentiationIdeas: candidate.competitionReport.differentiationIdeas,
          confidence: candidate.competitionReport.confidence,
          collectedAt: candidate.competitionReport.collectedAt.toISOString()
        }
      : undefined,
    supplierLeads: (candidate.supplierLeads ?? []).map((lead: any) => ({
      id: lead.id,
      candidateId: lead.candidateId,
      sourceSite: fromPrismaSupplierSourceSite(lead.sourceSite),
      supplierName: lead.supplierName,
      supplierCountry: lead.supplierCountry,
      moq: lead.moq,
      unitPriceRange: lead.unitPriceRange,
      leadTime: lead.leadTime,
      confidence: lead.confidence,
      contactNote: lead.contactNote,
      riskLevel: lead.riskLevel,
      searchUrl: lead.searchUrl,
      sampleAvailable: lead.sampleAvailable,
      oemAvailable: lead.oemAvailable,
      capabilitySummary: lead.capabilitySummary,
      contactEmail: lead.contactEmail ?? undefined
    })),
    negotiationThreads: (candidate.negotiationThreads ?? []).map((thread: any) => {
      const pending = thread.approvals?.find?.((approval: any) => approval.status === "pending");
      const latestApproval = thread.approvals?.[0];
      const latestDraft = thread.drafts?.[0];

      return {
        id: thread.id,
        candidateId: thread.candidateId,
        supplierLeadId: thread.supplierLeadId,
        mailboxConnectionId: thread.mailboxConnectionId ?? undefined,
        status: thread.status,
        summary: thread.summary,
        nextRecommendedAction: thread.nextRecommendedAction,
        latestDraft: latestDraft
          ? {
              id: latestDraft.id,
              candidateId: latestDraft.candidateId,
              supplierLeadId: latestDraft.supplierLeadId,
              threadId: latestDraft.threadId,
              subject: latestDraft.subject,
              body: latestDraft.body,
              checklist: latestDraft.checklist,
              createdAt: latestDraft.createdAt.toISOString(),
              status: latestDraft.status as "draft" | "approved" | "sent"
            }
          : undefined,
        messages: (thread.messages ?? []).map((message: any) => ({
          id: message.id,
          threadId: message.threadId,
          direction: message.direction,
          subject: message.subject,
          body: message.body,
          summary: message.summary,
          extractedTerms: toNegotiationExtractedTerms(message.extractedTerms),
          createdAt: message.createdAt.toISOString()
        })),
        guardrails: {
          targetUnitPriceUsd: thread.targetUnitPriceUsd,
          maxMoq: thread.maxMoq,
          askSample: thread.askSample,
          desiredIncoterm: thread.desiredIncoterm,
          bannedPhrases: thread.bannedPhrases
        },
        pendingApproval: pending
          ? {
              id: pending.id,
              threadId: thread.id,
              draftId: pending.draftId,
              status: "pending",
              createdAt: pending.createdAt.toISOString(),
              decidedAt: undefined
            }
          : latestApproval
            ? {
                id: latestApproval.id,
                threadId: thread.id,
                draftId: latestApproval.draftId,
                status: latestApproval.status,
                createdAt: latestApproval.createdAt.toISOString(),
                decidedAt: latestApproval.decidedAt?.toISOString()
              }
            : undefined,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString()
      };
    })
  };
}

function toNegotiationExtractedTerms(value: unknown): NegotiationExtractedTerms | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Partial<NegotiationExtractedTerms>;

  return {
    moq: typeof record.moq === "string" ? record.moq : undefined,
    unitPriceRange: typeof record.unitPriceRange === "string" ? record.unitPriceRange : undefined,
    leadTime: typeof record.leadTime === "string" ? record.leadTime : undefined,
    sampleAvailable: typeof record.sampleAvailable === "boolean" ? record.sampleAvailable : undefined,
    notes: Array.isArray(record.notes) ? record.notes.filter((item): item is string => typeof item === "string") : []
  };
}

function buildRunStages(
  currentStage: DiscoveryRun["currentStage"],
  status: DiscoveryRun["status"]
): RunStageSnapshot[] {
  const currentIndex = SOURCING_STAGE_ORDER.indexOf(currentStage);

  return SOURCING_STAGE_ORDER.map((stage, index) => {
    let stageStatus: RunStageSnapshot["status"] = "pending";

    if (index < currentIndex) {
      stageStatus = "completed";
    } else if (index === currentIndex) {
      stageStatus = status === "failed" ? "failed" : status === "completed" ? "completed" : "active";
    }

    return {
      stage,
      label: SOURCING_STAGE_LABELS[stage],
      status: stageStatus,
      updatedAt: new Date().toISOString()
    };
  });
}

function buildSupplierSearchLinks(productName: string) {
  const query = encodeURIComponent(productName);

  return [
    {
      label: "Alibaba" as const,
      url: `https://www.alibaba.com/trade/search?SearchText=${query}`
    },
    {
      label: "1688" as const,
      url: `https://s.1688.com/selloffer/offer_search.htm?keywords=${query}`
    },
    {
      label: "Global Sources" as const,
      url: `https://www.globalsources.com/search-results/${query}`
    }
  ];
}

function toPrismaSupplierSourceSite(value: "Alibaba" | "1688" | "Global Sources") {
  switch (value) {
    case "Alibaba":
      return "Alibaba" as const;
    case "1688":
      return "site_1688" as const;
    case "Global Sources":
      return "global_sources" as const;
    default:
      return "Alibaba" as const;
  }
}

function fromPrismaSupplierSourceSite(value: "Alibaba" | "site_1688" | "global_sources") {
  switch (value) {
    case "Alibaba":
      return "Alibaba";
    case "site_1688":
      return "1688";
    case "global_sources":
      return "Global Sources";
    default:
      return "Alibaba";
  }
}

function toDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRequiredDate(value?: string) {
  return toDate(value) ?? new Date();
}
