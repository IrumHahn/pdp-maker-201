export type TrendTimeUnit = "date" | "week" | "month";
export type TrendDeviceCode = "pc" | "mo";
export type TrendGenderCode = "f" | "m";
export type TrendAgeCode = "10" | "20" | "30" | "40" | "50" | "60";

export type TrendProfileStatus = "active" | "paused";
export type TrendCollectionRunStatus = "queued" | "running" | "completed" | "failed";
export type TrendCollectionTaskStatus = "pending" | "running" | "completed" | "failed";
export type TrendSyncStatus = "idle" | "syncing" | "synced" | "failed";

export interface TrendCategoryNode {
  cid: number;
  name: string;
  fullPath: string;
  level: number;
  leaf: boolean;
}

export interface TrendProfileInput {
  name: string;
  categoryCid: number;
  categoryPath: string;
  categoryDepth: number;
  timeUnit: TrendTimeUnit;
  devices: TrendDeviceCode[];
  genders: TrendGenderCode[];
  ages: TrendAgeCode[];
  spreadsheetId: string;
}

export interface TrendProfile extends TrendProfileInput {
  id: string;
  slug: string;
  status: TrendProfileStatus;
  startPeriod: string;
  endPeriod: string;
  lastCollectedPeriod?: string;
  lastSyncedAt?: string;
  syncStatus: TrendSyncStatus;
  latestRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrendCollectionTask {
  id: string;
  runId: string;
  profileId: string;
  period: string;
  status: TrendCollectionTaskStatus;
  completedPages: number;
  totalPages: number;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  failureSnippet?: string;
  updatedAt: string;
}

export interface TrendCollectionRun {
  id: string;
  profileId: string;
  status: TrendCollectionRunStatus;
  requestedBy: string;
  runType: "backfill";
  startPeriod: string;
  endPeriod: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalSnapshots: number;
  sheetUrl?: string;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrendKeywordSnapshot {
  id: string;
  profileId: string;
  runId: string;
  taskId: string;
  period: string;
  rank: number;
  keyword: string;
  linkId: string;
  categoryCid: number;
  categoryPath: string;
  devices: TrendDeviceCode[];
  genders: TrendGenderCode[];
  ages: TrendAgeCode[];
  collectedAt: string;
}

export interface TrendRunDetail extends TrendCollectionRun {
  profile: TrendProfile;
  tasks: TrendCollectionTask[];
  snapshotsPreview: TrendKeywordSnapshot[];
}

export interface TrendAdminMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: "stable" | "attention" | "progress";
}

export interface TrendAdminBoard {
  generatedAt: string;
  metrics: TrendAdminMetric[];
  profiles: TrendProfile[];
  runs: TrendRunDetail[];
}

export interface TrendSheetTabPayload {
  title: string;
  rows: string[][];
}

export const TREND_MONTHLY_START_PERIOD = "2017-08";
export const TREND_MONTHLY_END_PERIOD = "2026-02";
export const TREND_MAX_RANK = 500;
export const TREND_PAGE_SIZE = 20;
export const TREND_TOTAL_PAGES = 25;
export const TREND_DEVICE_OPTIONS: TrendDeviceCode[] = ["pc", "mo"];
export const TREND_GENDER_OPTIONS: TrendGenderCode[] = ["f", "m"];
export const TREND_AGE_OPTIONS: TrendAgeCode[] = ["10", "20", "30", "40", "50", "60"];

export function listMonthlyPeriods(startPeriod = TREND_MONTHLY_START_PERIOD, endPeriod = TREND_MONTHLY_END_PERIOD) {
  const periods: string[] = [];
  const [startYear, startMonth] = startPeriod.split("-").map((value) => Number(value));
  const [endYear, endMonth] = endPeriod.split("-").map((value) => Number(value));

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return periods;
}

export function serializeTrendFilter<T extends string>(values: T[]) {
  return values.join(",");
}

export function formatTrendMatrixPeriod(period: string) {
  return period;
}

export function normalizeTrendSpreadsheetId(spreadsheetId: string) {
  const trimmed = spreadsheetId.trim();
  if (!trimmed) {
    return "";
  }

  const pathMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  return trimmed;
}

export function buildTrendSheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${normalizeTrendSpreadsheetId(spreadsheetId)}`;
}
