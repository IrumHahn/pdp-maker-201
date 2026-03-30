import {
  TREND_MAX_RANK,
  TREND_TOTAL_PAGES,
  buildTrendSheetUrl,
  listMonthlyPeriods,
  type TrendCollectionRun,
  type TrendCollectionTask,
  type TrendKeywordSnapshot,
  type TrendProfile,
  type TrendSheetTabPayload
} from "@runacademy/shared";

export interface NaverKeywordRankItem {
  rank: number;
  keyword: string;
  linkId: string;
}

export interface NaverKeywordRankPage {
  message: string | null;
  statusCode: number;
  returnCode: number;
  range: string;
  ranks: NaverKeywordRankItem[];
}

export function nowIso() {
  return new Date().toISOString();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function slugifyTrendName(value: string) {
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^0-9a-z\uac00-\ud7a3-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return compact || `trend-${Date.now()}`;
}

export function sanitizeSheetTabName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, "-").trim().slice(0, 90) || "sheet";
}

export function monthPeriodToDateRange(period: string) {
  const [year, month] = period.split("-").map((value) => Number(value));
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

export function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function summarizeFailureSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function mergeKeywordRankPages(pages: NaverKeywordRankPage[]) {
  const merged = pages.flatMap((page) => page.ranks).sort((left, right) => left.rank - right.rank);

  if (merged.length !== TREND_MAX_RANK) {
    throw new Error(`Expected ${TREND_MAX_RANK} keywords but received ${merged.length}.`);
  }

  const uniqueRanks = new Set(merged.map((item) => item.rank));
  if (uniqueRanks.size !== TREND_MAX_RANK) {
    throw new Error("Duplicate ranks detected while merging keyword pages.");
  }

  if (merged[0]?.rank !== 1 || merged[merged.length - 1]?.rank !== TREND_MAX_RANK) {
    throw new Error("Rank range is incomplete.");
  }

  return merged;
}

export function buildTrendSheetTabs(profile: TrendProfile, snapshots: TrendKeywordSnapshot[]) {
  const periodOrder = listMonthlyPeriods(profile.startPeriod, profile.endPeriod);
  const snapshotsByPeriod = new Map<string, Map<number, TrendKeywordSnapshot>>();

  snapshots.forEach((snapshot) => {
    if (!snapshotsByPeriod.has(snapshot.period)) {
      snapshotsByPeriod.set(snapshot.period, new Map());
    }

    snapshotsByPeriod.get(snapshot.period)!.set(snapshot.rank, snapshot);
  });

  const metaRows = [
    ["field", "value"],
    ["profile_id", profile.id],
    ["name", profile.name],
    ["category_path", profile.categoryPath],
    ["category_cid", String(profile.categoryCid)],
    ["time_unit", profile.timeUnit],
    ["devices", profile.devices.join(",") || "all"],
    ["genders", profile.genders.join(",") || "all"],
    ["ages", profile.ages.join(",") || "all"],
    ["start_period", profile.startPeriod],
    ["end_period", profile.endPeriod],
    ["last_collected_period", profile.lastCollectedPeriod ?? ""],
    ["last_synced_at", profile.lastSyncedAt ?? ""],
    ["sheet_url", buildTrendSheetUrl(profile.spreadsheetId)]
  ];

  const rawRows = [
    ["period", "rank", "keyword", "link_id", "category_path", "device", "gender", "age", "collected_at"],
    ...snapshots
      .slice()
      .sort((left, right) => left.period.localeCompare(right.period) || left.rank - right.rank)
      .map((snapshot) => [
        snapshot.period,
        String(snapshot.rank),
        snapshot.keyword,
        snapshot.linkId,
        snapshot.categoryPath,
        snapshot.devices.join(","),
        snapshot.genders.join(","),
        snapshot.ages.join(","),
        snapshot.collectedAt
      ])
  ];

  const matrixRows = [
    ["rank", ...periodOrder],
    ...Array.from({ length: TREND_MAX_RANK }, (_, index) => {
      const rank = index + 1;

      return [
        String(rank),
        ...periodOrder.map((period) => snapshotsByPeriod.get(period)?.get(rank)?.keyword ?? "")
      ];
    })
  ];

  return [
    {
      title: sanitizeSheetTabName(`meta_${profile.slug}`),
      rows: metaRows
    },
    {
      title: sanitizeSheetTabName(`raw_${profile.slug}`),
      rows: rawRows
    },
    {
      title: sanitizeSheetTabName(`matrix_${profile.slug}`),
      rows: matrixRows
    }
  ] satisfies TrendSheetTabPayload[];
}

export function buildTrendMetrics(
  profiles: TrendProfile[],
  runs: TrendCollectionRun[],
  tasks: TrendCollectionTask[],
  snapshots: TrendKeywordSnapshot[]
) {
  const queuedOrRunning = runs.filter((run) => run.status === "queued" || run.status === "running").length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;
  const latestSync = profiles
    .map((profile) => profile.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0];

  return [
    {
      id: "profiles",
      label: "활성 프로필",
      value: `${profiles.filter((profile) => profile.status === "active").length}개`,
      hint: "수집 가능한 필터 프로필 개수",
      tone: "stable" as const
    },
    {
      id: "runs",
      label: "대기/실행 런",
      value: `${queuedOrRunning}건`,
      hint: "worker가 처리할 백필 런 상태",
      tone: queuedOrRunning > 0 ? ("progress" as const) : ("stable" as const)
    },
    {
      id: "snapshots",
      label: "누적 스냅샷",
      value: `${snapshots.length.toLocaleString("ko-KR")}건`,
      hint: "프로필별 월간 Top500 적재량",
      tone: "stable" as const
    },
    {
      id: "failures",
      label: "실패 태스크",
      value: `${failedTasks}건`,
      hint: latestSync ? `마지막 시트 동기화 ${latestSync}` : "아직 시트 동기화 이력이 없습니다.",
      tone: failedTasks > 0 ? ("attention" as const) : ("stable" as const)
    }
  ];
}

export function sortRunsDesc<T extends { updatedAt: string }>(items: T[]) {
  return items.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function calculateTaskTotals(tasks: TrendCollectionTask[]) {
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    failedTasks: tasks.filter((task) => task.status === "failed").length
  };
}

export function buildPeriodCompletionMap(snapshots: TrendKeywordSnapshot[]) {
  const counts = new Map<string, Set<number>>();

  snapshots.forEach((snapshot) => {
    if (!counts.has(snapshot.period)) {
      counts.set(snapshot.period, new Set());
    }

    counts.get(snapshot.period)!.add(snapshot.rank);
  });

  return new Map(Array.from(counts.entries()).map(([period, ranks]) => [period, ranks.size >= TREND_MAX_RANK]));
}

export function getLastCollectedPeriod(snapshots: TrendKeywordSnapshot[]) {
  return snapshots
    .map((snapshot) => snapshot.period)
    .sort()
    .reverse()[0];
}

export function getTaskProgressLabel(task: TrendCollectionTask) {
  return `${task.completedPages}/${TREND_TOTAL_PAGES}`;
}
