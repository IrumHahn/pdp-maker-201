import { randomUUID } from "crypto";
import {
  TREND_MONTHLY_END_PERIOD,
  TREND_MONTHLY_START_PERIOD,
  TREND_TOTAL_PAGES,
  normalizeTrendSpreadsheetId,
  type TrendAdminBoard,
  type TrendAgeCode,
  type TrendCollectionRun,
  type TrendCollectionTask,
  type TrendDeviceCode,
  type TrendGenderCode,
  type TrendKeywordSnapshot,
  type TrendProfile,
  type TrendProfileInput,
  type TrendRunDetail
} from "@runacademy/shared";
import { SourcingStoreService } from "../sourcing/sourcing.store";
import { NaverTrendClient, TrendSourceError, type TrendSourceClient } from "./trend.naver";
import { TrendSheetsSyncService, type TrendSheetsSyncGateway } from "./trend.sheets";
import {
  buildPeriodCompletionMap,
  buildTrendMetrics,
  calculateTaskTotals,
  nowIso,
  slugifyTrendName,
  sortRunsDesc,
  summarizeFailureSnippet
} from "./trend.utils";

interface TrendServiceDeps {
  naverClient?: TrendSourceClient;
  sheetsSync?: TrendSheetsSyncGateway;
}

const DEFAULT_OPERATOR_ID = "haniroom-trend-operator";

export class TrendService {
  private readonly naverClient: TrendSourceClient;
  private readonly sheetsSync: TrendSheetsSyncGateway;

  constructor(
    private readonly store: SourcingStoreService,
    deps: TrendServiceDeps = {}
  ) {
    this.naverClient = deps.naverClient ?? new NaverTrendClient();
    this.sheetsSync = deps.sheetsSync ?? new TrendSheetsSyncService();
  }

  async getAdminBoard() {
    return this.store.read((data) => {
      const profiles = data.trendProfiles.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const runs = sortRunsDesc(data.trendRuns).slice(0, 8).map((run) => this.buildRunDetail(run, data));
      const board: TrendAdminBoard = {
        generatedAt: nowIso(),
        metrics: buildTrendMetrics(data.trendProfiles, data.trendRuns, data.trendTasks, data.trendSnapshots),
        profiles,
        runs
      };

      return {
        ok: true as const,
        board
      };
    });
  }

  async listProfiles() {
    return this.store.read((data) => ({
      ok: true as const,
      profiles: data.trendProfiles.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    }));
  }

  async getRun(runId: string) {
    return this.store.read((data) => {
      const run = data.trendRuns.find((item) => item.id === runId);

      if (!run) {
        return {
          ok: false as const,
          code: "TREND_RUN_NOT_FOUND",
          message: "runId에 해당하는 트렌드 수집 런이 없습니다."
        };
      }

      return {
        ok: true as const,
        run: this.buildRunDetail(run, data)
      };
    });
  }

  async createProfile(input: TrendProfileInput) {
    if (input.timeUnit !== "month") {
      return {
        ok: false as const,
        code: "TIME_UNIT_NOT_SUPPORTED",
        message: "v1에서는 월간만 지원합니다."
      };
    }

    const now = nowIso();
    const profile: TrendProfile = {
      id: randomUUID(),
      slug: slugifyTrendName(input.name),
      status: "active",
      startPeriod: TREND_MONTHLY_START_PERIOD,
      endPeriod: TREND_MONTHLY_END_PERIOD,
      lastCollectedPeriod: undefined,
      lastSyncedAt: undefined,
      latestRunId: undefined,
      syncStatus: "idle",
      createdAt: now,
      updatedAt: now,
      ...normalizeProfileInput(input)
    };

    await this.store.mutate((data) => {
      const duplicate = data.trendProfiles.find((item) => item.slug === profile.slug);
      if (duplicate) {
        profile.slug = `${profile.slug}-${data.trendProfiles.length + 1}`;
      }

      data.trendProfiles.push(profile);
    });

    return {
      ok: true as const,
      profile
    };
  }

  async fetchCategoryChildren(cid: number) {
    const nodes = await this.naverClient.fetchCategoryChildren(cid);

    return {
      ok: true as const,
      nodes
    };
  }

  async startBackfill(profileId: string) {
    const result = await this.store.mutate((data) => {
      const profile = data.trendProfiles.find((item) => item.id === profileId);

      if (!profile) {
        return {
          ok: false as const,
          code: "TREND_PROFILE_NOT_FOUND",
          message: "profileId에 해당하는 트렌드 프로필이 없습니다."
        };
      }

      const completedPeriods = buildPeriodCompletionMap(
        data.trendSnapshots.filter((snapshot) => snapshot.profileId === profileId)
      );
      const now = nowIso();
      const tasks: TrendCollectionTask[] = [];

      for (const period of listMonthlyPeriodsForProfile(profile)) {
        if (completedPeriods.get(period)) {
          continue;
        }

        tasks.push({
          id: randomUUID(),
          runId: "",
          profileId,
          period,
          status: "pending",
          completedPages: 0,
          totalPages: TREND_TOTAL_PAGES,
          retryCount: 0,
          updatedAt: now
        });
      }

      const run: TrendCollectionRun = {
        id: randomUUID(),
        profileId,
        status: tasks.length ? "queued" : "completed",
        requestedBy: DEFAULT_OPERATOR_ID,
        runType: "backfill",
        startPeriod: profile.startPeriod,
        endPeriod: profile.endPeriod,
        totalTasks: tasks.length,
        completedTasks: tasks.length ? 0 : 0,
        failedTasks: 0,
        totalSnapshots: 0,
        sheetUrl: undefined,
        startedAt: undefined,
        completedAt: tasks.length ? undefined : now,
        failureReason: undefined,
        createdAt: now,
        updatedAt: now
      };

      tasks.forEach((task) => {
        task.runId = run.id;
      });

      data.trendRuns.push(run);
      data.trendTasks.push(...tasks);
      profile.latestRunId = run.id;
      profile.updatedAt = now;

      return {
        ok: true as const,
        run: this.buildRunDetail(run, data)
      };
    });

    return result;
  }

  async retryFailures(runId: string) {
    const result = await this.store.mutate((data) => {
      const run = data.trendRuns.find((item) => item.id === runId);

      if (!run) {
        return {
          ok: false as const,
          code: "TREND_RUN_NOT_FOUND",
          message: "runId에 해당하는 트렌드 수집 런이 없습니다."
        };
      }

      const targetTasks = data.trendTasks.filter((task) => task.runId === runId && task.status === "failed");
      const now = nowIso();

      targetTasks.forEach((task) => {
        task.status = "pending";
        task.retryCount += 1;
        task.failureReason = undefined;
        task.failureSnippet = undefined;
        task.completedPages = 0;
        task.startedAt = undefined;
        task.completedAt = undefined;
        task.updatedAt = now;
      });

      run.status = targetTasks.length ? "queued" : run.status;
      run.failedTasks = 0;
      run.failureReason = undefined;
      run.completedAt = undefined;
      run.updatedAt = now;

      return {
        ok: true as const,
        run: this.buildRunDetail(run, data)
      };
    });

    return result;
  }

  async syncProfile(profileId: string) {
    const seed = await this.store.read((data) => {
      const profile = data.trendProfiles.find((item) => item.id === profileId);

      return {
        profile,
        snapshots: data.trendSnapshots.filter((snapshot) => snapshot.profileId === profileId)
      };
    });

    if (!seed.profile) {
      return {
        ok: false as const,
        code: "TREND_PROFILE_NOT_FOUND",
        message: "profileId에 해당하는 트렌드 프로필이 없습니다."
      };
    }

    await this.store.mutate((data) => {
      const profile = data.trendProfiles.find((item) => item.id === profileId);
      if (profile) {
        profile.syncStatus = "syncing";
        profile.updatedAt = nowIso();
      }
    });

    try {
      const result = await this.sheetsSync.syncProfile(seed.profile, seed.snapshots);
      await this.store.mutate((data) => {
        const profile = data.trendProfiles.find((item) => item.id === profileId);
        if (profile) {
          profile.lastSyncedAt = nowIso();
          profile.syncStatus = "synced";
          profile.updatedAt = nowIso();
        }

        const latestRun = profile?.latestRunId ? data.trendRuns.find((item) => item.id === profile.latestRunId) : undefined;
        if (latestRun) {
          latestRun.sheetUrl = result.sheetUrl;
          latestRun.updatedAt = nowIso();
        }
      });

      return {
        ok: true as const,
        sheetUrl: result.sheetUrl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sheets 동기화에 실패했습니다.";

      await this.store.mutate((data) => {
        const profile = data.trendProfiles.find((item) => item.id === profileId);
        if (profile) {
          profile.syncStatus = "failed";
          profile.updatedAt = nowIso();
        }
      });

      return {
        ok: false as const,
        code: "TREND_SHEET_SYNC_FAILED",
        message
      };
    }
  }

  async processNextQueuedRun() {
    const claimed = await this.store.mutate((data) => {
      const candidateRun = sortRunsDesc(
        data.trendRuns.filter((run) => run.status === "queued" || run.status === "running")
      ).find((run) => data.trendTasks.some((task) => task.runId === run.id && task.status === "pending"));

      if (!candidateRun) {
        return null;
      }

      const nextTask = data.trendTasks
        .filter((task) => task.runId === candidateRun.id && task.status === "pending")
        .sort((left, right) => left.period.localeCompare(right.period))[0];

      if (!nextTask) {
        return null;
      }

      const now = nowIso();
      candidateRun.status = "running";
      candidateRun.startedAt ??= now;
      candidateRun.updatedAt = now;
      nextTask.status = "running";
      nextTask.startedAt = now;
      nextTask.updatedAt = now;

      const profile = data.trendProfiles.find((item) => item.id === candidateRun.profileId);
      if (!profile) {
        nextTask.status = "failed";
        nextTask.failureReason = "Trend profile is missing.";
        nextTask.failureSnippet = "Missing profile";
        nextTask.updatedAt = now;
        return null;
      }

      return {
        run: structuredClone(candidateRun),
        task: structuredClone(nextTask),
        profile: structuredClone(profile)
      };
    });

    if (!claimed) {
      return {
        ok: true as const,
        processed: false
      };
    }

    try {
      const ranks = await this.naverClient.collectMonthlyRanks({
        categoryCid: claimed.profile.categoryCid,
        period: claimed.task.period,
        devices: claimed.profile.devices,
        genders: claimed.profile.genders,
        ages: claimed.profile.ages
      });

      const collectedAt = nowIso();
      const snapshots: TrendKeywordSnapshot[] = ranks.map((rank) => ({
        id: randomUUID(),
        profileId: claimed.profile.id,
        runId: claimed.run.id,
        taskId: claimed.task.id,
        period: claimed.task.period,
        rank: rank.rank,
        keyword: rank.keyword,
        linkId: rank.linkId,
        categoryCid: claimed.profile.categoryCid,
        categoryPath: claimed.profile.categoryPath,
        devices: claimed.profile.devices,
        genders: claimed.profile.genders,
        ages: claimed.profile.ages,
        collectedAt
      }));

      await this.store.mutate((data) => {
        data.trendSnapshots = data.trendSnapshots.filter(
          (snapshot) => !(snapshot.profileId === claimed.profile.id && snapshot.period === claimed.task.period)
        );
        data.trendSnapshots.push(...snapshots);

        const task = data.trendTasks.find((item) => item.id === claimed.task.id);
        if (task) {
          task.status = "completed";
          task.completedPages = TREND_TOTAL_PAGES;
          task.completedAt = collectedAt;
          task.updatedAt = collectedAt;
        }

        const profile = data.trendProfiles.find((item) => item.id === claimed.profile.id);
        if (profile) {
          profile.lastCollectedPeriod = claimed.task.period;
          profile.updatedAt = collectedAt;
        }

        const run = data.trendRuns.find((item) => item.id === claimed.run.id);
        if (run) {
          this.refreshRunState(run, data.trendTasks.filter((item) => item.runId === claimed.run.id), data.trendSnapshots);
        }
      });

      const runAfterTask = await this.store.read((data) => data.trendRuns.find((item) => item.id === claimed.run.id));
      if (runAfterTask?.status === "completed") {
        await this.syncProfile(claimed.profile.id);
      }

      return {
        ok: true as const,
        processed: true,
        runId: claimed.run.id,
        taskId: claimed.task.id,
        period: claimed.task.period
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Naver collection failed.";
      const snippet =
        error instanceof TrendSourceError && error.snippet ? error.snippet : summarizeFailureSnippet(String(error));

      await this.store.mutate((data) => {
        const task = data.trendTasks.find((item) => item.id === claimed.task.id);
        if (task) {
          task.status = "failed";
          task.failureReason = message;
          task.failureSnippet = snippet;
          task.updatedAt = nowIso();
        }

        const run = data.trendRuns.find((item) => item.id === claimed.run.id);
        if (run) {
          this.refreshRunState(run, data.trendTasks.filter((item) => item.runId === claimed.run.id), data.trendSnapshots);
        }

        const profile = data.trendProfiles.find((item) => item.id === claimed.profile.id);
        if (profile) {
          profile.updatedAt = nowIso();
        }
      });

      return {
        ok: false as const,
        processed: true,
        code: "TREND_COLLECTION_FAILED",
        message,
        runId: claimed.run.id,
        taskId: claimed.task.id,
        period: claimed.task.period
      };
    }
  }

  private buildRunDetail(run: TrendCollectionRun, data: any): TrendRunDetail {
    const profile = data.trendProfiles.find((item: TrendProfile) => item.id === run.profileId)!;
    const tasks = data.trendTasks
      .filter((task: TrendCollectionTask) => task.runId === run.id)
      .sort((left: TrendCollectionTask, right: TrendCollectionTask) => left.period.localeCompare(right.period));
    const snapshotsPreview = data.trendSnapshots
      .filter((snapshot: TrendKeywordSnapshot) => snapshot.runId === run.id)
      .sort((left: TrendKeywordSnapshot, right: TrendKeywordSnapshot) => right.period.localeCompare(left.period) || left.rank - right.rank)
      .slice(0, 20);

    return {
      ...run,
      profile,
      tasks,
      snapshotsPreview
    };
  }

  private refreshRunState(run: TrendCollectionRun, tasks: TrendCollectionTask[], snapshots: TrendKeywordSnapshot[]) {
    const totals = calculateTaskTotals(tasks);
    const now = nowIso();
    run.totalTasks = totals.totalTasks;
    run.completedTasks = totals.completedTasks;
    run.failedTasks = totals.failedTasks;
    run.totalSnapshots = snapshots.filter((snapshot) => snapshot.runId === run.id).length;
    run.updatedAt = now;

    if (totals.totalTasks === 0 || totals.completedTasks === totals.totalTasks) {
      run.status = "completed";
      run.completedAt = now;
      run.failureReason = undefined;
      return;
    }

    if (totals.completedTasks + totals.failedTasks === totals.totalTasks && totals.failedTasks > 0) {
      run.status = "failed";
      run.completedAt = now;
      run.failureReason = `${totals.failedTasks}개 월 수집이 실패했습니다.`;
      return;
    }

    run.status = "running";
    run.completedAt = undefined;
  }
}

function normalizeProfileInput(input: TrendProfileInput): TrendProfileInput {
  return {
    name: input.name.trim(),
    categoryCid: Number(input.categoryCid),
    categoryPath: input.categoryPath.trim(),
    categoryDepth: input.categoryDepth,
    timeUnit: input.timeUnit,
    devices: normalizeUnique(input.devices),
    genders: normalizeUnique(input.genders),
    ages: normalizeUnique(input.ages),
    spreadsheetId: normalizeTrendSpreadsheetId(input.spreadsheetId)
  };
}

function normalizeUnique<T extends TrendDeviceCode | TrendGenderCode | TrendAgeCode>(values: T[]) {
  return Array.from(new Set(values)).sort();
}

function listMonthlyPeriodsForProfile(profile: TrendProfile) {
  const periods: string[] = [];
  const [startYear, startMonth] = profile.startPeriod.split("-").map((value) => Number(value));
  const [endYear, endMonth] = profile.endPeriod.split("-").map((value) => Number(value));

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      year += 1;
      month = 1;
    }
  }

  return periods;
}
