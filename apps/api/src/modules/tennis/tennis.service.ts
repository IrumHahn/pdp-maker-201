import { randomUUID } from "crypto";
import {
  TENNIS_SOURCE_DEFINITIONS,
  type TennisAdminBoardResponse,
  type TennisBoardMetric,
  type TennisRawTournamentRecord,
  type TennisReviewItem,
  type TennisSourceId,
  type TennisSourceReference,
  type TennisSourceSnapshot,
  type TennisSourceStatus,
  type TennisSourceStatusResponse,
  type TennisSyncResponse,
  type TennisTournament,
  type TennisTournamentDetailResponse,
  type TennisTournamentListResponse
} from "@runacademy/shared";
import { createTennisConnectors, type TennisConnector } from "./tennis.connectors";
import { TennisStoreService } from "./tennis.store";
import {
  buildFingerprint,
  buildFreshnessLabel,
  buildRegistrationHint,
  formatStatusLabel,
  inferAgeSummary,
  inferCity,
  inferFormatTags,
  inferGenderSummary,
  inferLevelTags,
  inferRankingType,
  inferRegion,
  mapTournamentStatus,
  nowIso,
  parseDateRange,
  parseDateTime,
  parseFeeAmount,
  slugify,
  summarizeEligibility,
  summarizeFormats
} from "./tennis.utils";

interface TennisServiceDeps {
  connectors?: Partial<Record<TennisSourceId, TennisConnector>>;
}

interface TournamentFilters {
  query?: string;
  region?: string;
  level?: string;
  fee?: string;
  ranking?: string;
  format?: string;
  status?: string;
}

export class TennisService {
  private readonly connectors: Record<TennisSourceId, TennisConnector>;
  private bootstrapPromise: Promise<void> | null = null;

  constructor(
    private readonly store = new TennisStoreService(),
    deps: TennisServiceDeps = {}
  ) {
    this.connectors = {
      ...createTennisConnectors(),
      ...deps.connectors
    };
  }

  async getBoard(): Promise<TennisAdminBoardResponse> {
    await this.ensureBootstrapped();

    return this.store.read((data) => {
      const tournaments = filterVisibleTournaments(dedupeEntries(data.entries));
      const board = {
        generatedAt: nowIso(),
        metrics: buildMetrics(tournaments, data.sources),
        featured: tournaments.slice(0, 4),
        tournaments,
        sources: data.sources.slice().sort((left, right) => left.priority - right.priority),
        reviewQueue: buildReviewQueue(tournaments),
        recentRuns: data.runs.slice().sort((left, right) => right.startedAt.localeCompare(left.startedAt)).slice(0, 6)
      };

      return {
        ok: true,
        board
      };
    });
  }

  async listTournaments(filters: TournamentFilters = {}): Promise<TennisTournamentListResponse> {
    await this.ensureBootstrapped();

    return this.store.read((data) => {
      let tournaments = filterVisibleTournaments(dedupeEntries(data.entries));

      tournaments = applyFilters(tournaments, filters);

      return {
        ok: true,
        generatedAt: nowIso(),
        total: tournaments.length,
        tournaments
      };
    });
  }

  async getTournament(tournamentId: string): Promise<TennisTournamentDetailResponse | { ok: false; code: string; message: string }> {
    await this.ensureBootstrapped();

    return this.store.read((data) => {
      const tournament = dedupeEntries(data.entries).find((item) => item.id === tournamentId || item.slug === tournamentId);

      if (!tournament) {
        return {
          ok: false as const,
          code: "TOURNAMENT_NOT_FOUND",
          message: "요청한 대회를 찾을 수 없습니다."
        };
      }

      return {
        ok: true as const,
        tournament
      };
    });
  }

  async getSources(): Promise<TennisSourceStatusResponse> {
    await this.ensureBootstrapped();

    return this.store.read((data) => ({
      ok: true,
      generatedAt: nowIso(),
      sources: data.sources.slice().sort((left, right) => left.priority - right.priority)
    }));
  }

  async syncSource(sourceId: TennisSourceId): Promise<TennisSyncResponse | { ok: false; code: string; message: string }> {
    if (!this.connectors[sourceId]) {
      return {
        ok: false,
        code: "SOURCE_NOT_FOUND",
        message: "지원하지 않는 테니스 소스입니다."
      };
    }

    return this.runSync([sourceId]);
  }

  async syncAll(): Promise<TennisSyncResponse> {
    return this.runSync(TENNIS_SOURCE_DEFINITIONS.map((item) => item.id));
  }

  private async ensureBootstrapped() {
    const initialized = await this.store.read((data) => data.entries.length > 0 && data.sources.length > 0);

    if (initialized) {
      return;
    }

    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.syncAll().then(
        () => undefined,
        () => undefined
      );
    }

    await this.bootstrapPromise;
  }

  private async runSync(sourceIds: TennisSourceId[]): Promise<TennisSyncResponse> {
    const startedAt = nowIso();
    const aggregatedEntries: TennisTournament[] = [];
    const aggregatedSnapshots: TennisSourceSnapshot[] = [];
    const sourceStatuses = new Map<TennisSourceId, TennisSourceStatus>();
    let syncedCount = 0;

    for (const definition of TENNIS_SOURCE_DEFINITIONS) {
      sourceStatuses.set(
        definition.id,
        sourceStatuses.get(definition.id) ?? {
          ...definition,
          state: "idle",
          recordCount: 0
        }
      );
    }

    for (const sourceId of sourceIds) {
      const connector = this.connectors[sourceId];
      const result = await connector.sync();
      const syncedAt = nowIso();
      const status = sourceStatuses.get(sourceId)!;
      const normalizedEntries = result.records.map((record) => normalizeRecord(record, syncedAt));

      aggregatedEntries.push(...normalizedEntries);
      aggregatedSnapshots.push(...result.snapshots);
      syncedCount += normalizedEntries.length;

      sourceStatuses.set(sourceId, {
        ...status,
        state: result.mode === "live_fetch" ? "healthy" : result.mode === "manual_seed" ? "warning" : "warning",
        lastSyncAt: syncedAt,
        lastSuccessfulSyncAt: syncedAt,
        lastMode: result.mode,
        recordCount: normalizedEntries.length,
        note: result.note
      });
    }

    const completedAt = nowIso();
    const run = {
      id: randomUUID(),
      requestedSourceId: sourceIds.length === TENNIS_SOURCE_DEFINITIONS.length ? ("all" as const) : sourceIds[0],
      startedAt,
      completedAt,
      success: true,
      syncedCount,
      snapshotCount: aggregatedSnapshots.length,
      mode: sourceIds.length === 1 ? sourceStatuses.get(sourceIds[0])?.lastMode ?? "fallback_fixture" : "fallback_fixture",
      message: sourceIds.length === 1 ? `${sourceIds[0]} 소스 동기화 완료` : "전체 소스 동기화 완료"
    };

    await this.store.mutate((data) => {
      const syncedSet = new Set(sourceIds);
      data.entries = data.entries.filter(
        (entry) => !entry.sourceRefs.some((reference) => syncedSet.has(reference.sourceId))
      );
      data.entries.push(...aggregatedEntries);

      data.snapshots = data.snapshots.filter((snapshot) => !syncedSet.has(snapshot.sourceId));
      data.snapshots.push(...aggregatedSnapshots);

      const mergedStatuses = new Map<TennisSourceId, TennisSourceStatus>();
      [...data.sources, ...Array.from(sourceStatuses.values())].forEach((status) => {
        if (!status) {
          return;
        }

        if (!mergedStatuses.has(status.id) || syncedSet.has(status.id)) {
          mergedStatuses.set(status.id, status);
        }
      });

      data.sources = Array.from(mergedStatuses.values());
      data.runs.push(run);
    });

    return {
      ok: true,
      run
    };
  }
}

function normalizeRecord(record: TennisRawTournamentRecord, collectedAt: string): TennisTournament {
  const rawEligibility = [record.divisionsText, record.eligibilityText].filter(Boolean).join(" / ");
  const { startDate, endDate } = parseDateRange(record.startDateText ?? record.endDateText ?? collectedAt.slice(0, 10));
  const rankingType = inferRankingType(`${record.title} ${rawEligibility}`);
  const levelTags = inferLevelTags(`${record.title} ${rawEligibility}`, rankingType);
  const formatTags = inferFormatTags(`${record.title} ${rawEligibility}`);
  const sourceRef: TennisSourceReference = {
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    pageUrl: record.pageUrl,
    detailUrl: record.detailUrl,
    registrationUrl: record.registrationUrl,
    registrationRoute: record.registrationRoute
  };
  const venue = record.venueText?.trim();
  const organizer = record.organizerText?.trim();
  const regionText = `${venue ?? ""} ${organizer ?? ""} ${record.title}`;
  const status = mapTournamentStatus(record.statusText ?? "", startDate, endDate);

  return {
    id: randomUUID(),
    slug: slugify(record.title),
    fingerprint: buildFingerprint(record.title, startDate, venue, organizer),
    name: record.title,
    organizer,
    venue,
    contactText: record.contactText,
    region: inferRegion(regionText),
    city: inferCity(regionText),
    startDate,
    endDate,
    registrationClosesAt: parseDateTime(record.notesText),
    feeText: record.feeText,
    feeAmount: parseFeeAmount(record.feeText),
    status,
    statusLabel: formatStatusLabel(status),
    rankingType,
    levelTags,
    levelSummary: summarizeEligibility(levelTags, rawEligibility, rankingType),
    formatTags,
    formatSummary: summarizeFormats(formatTags),
    genderSummary: inferGenderSummary(rawEligibility),
    ageSummary: inferAgeSummary(rawEligibility),
    rawEligibility,
    normalizedEligibility: summarizeEligibility(levelTags, rawEligibility, rankingType),
    sourceConfidence: record.confidence,
    sourceUpdatedAt: collectedAt,
    sourceRefs: [sourceRef],
    registrationRoute: record.registrationRoute,
    registrationUrl: record.registrationUrl ?? record.detailUrl,
    registrationHint: buildRegistrationHint(record.registrationRoute, record.sourceName),
    freshnessLabel: buildFreshnessLabel(collectedAt),
    notes: record.notesText
  };
}

function dedupeEntries(entries: TennisTournament[]) {
  const merged = new Map<string, TennisTournament>();

  entries.forEach((entry) => {
    const existing = merged.get(entry.fingerprint) ?? findLooseDuplicate(merged, entry);

    if (!existing) {
      merged.set(entry.fingerprint, entry);
      return;
    }

    const mergedTournament: TennisTournament = {
      ...existing,
      feeText: existing.feeText ?? entry.feeText,
      feeAmount: existing.feeAmount ?? entry.feeAmount,
      contactText: existing.contactText ?? entry.contactText,
      rawEligibility: existing.rawEligibility.length >= entry.rawEligibility.length ? existing.rawEligibility : entry.rawEligibility,
      normalizedEligibility: existing.normalizedEligibility,
      sourceConfidence: Math.max(existing.sourceConfidence, entry.sourceConfidence),
      sourceUpdatedAt: existing.sourceUpdatedAt > entry.sourceUpdatedAt ? existing.sourceUpdatedAt : entry.sourceUpdatedAt,
      freshnessLabel: buildFreshnessLabel(existing.sourceUpdatedAt > entry.sourceUpdatedAt ? existing.sourceUpdatedAt : entry.sourceUpdatedAt),
      sourceRefs: dedupeRefs([...existing.sourceRefs, ...entry.sourceRefs]),
      levelTags: Array.from(new Set([...existing.levelTags, ...entry.levelTags])).sort(),
      formatTags: Array.from(new Set([...existing.formatTags, ...entry.formatTags])).sort(),
      rankingType: chooseRanking(existing.rankingType, entry.rankingType),
      registrationUrl: existing.registrationUrl ?? entry.registrationUrl,
      registrationRoute: existing.registrationRoute === "manual_contact" ? entry.registrationRoute : existing.registrationRoute,
      registrationHint: existing.registrationRoute === "manual_contact" ? entry.registrationHint : existing.registrationHint,
      notes: [existing.notes, entry.notes].filter(Boolean).join(" / ") || undefined
    };

    mergedTournament.normalizedEligibility = summarizeEligibility(
      mergedTournament.levelTags,
      mergedTournament.rawEligibility,
      mergedTournament.rankingType
    );
    mergedTournament.levelSummary = mergedTournament.normalizedEligibility;
    mergedTournament.formatSummary = summarizeFormats(mergedTournament.formatTags);

    merged.set(existing.fingerprint, mergedTournament);
  });

  return Array.from(merged.values()).sort(sortTournaments);
}

function filterVisibleTournaments(tournaments: TennisTournament[]) {
  return tournaments.filter((tournament) => tournament.status !== "ended");
}

function dedupeRefs(refs: TennisSourceReference[]) {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.sourceId}|${ref.pageUrl}|${ref.detailUrl ?? ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function chooseRanking(left: TennisTournament["rankingType"], right: TennisTournament["rankingType"]) {
  if (left === right) {
    return left;
  }

  if (left === "ranked" || right === "ranked") {
    return "ranked";
  }

  if (left === "non_ranked" || right === "non_ranked") {
    return "non_ranked";
  }

  return "mixed";
}

function findLooseDuplicate(merged: Map<string, TennisTournament>, candidate: TennisTournament) {
  return Array.from(merged.values()).find(
    (item) => item.name === candidate.name && item.startDate === candidate.startDate && item.venue === candidate.venue
  );
}

function buildMetrics(tournaments: TennisTournament[], sources: TennisSourceStatus[]): TennisBoardMetric[] {
  const openCount = tournaments.filter((item) => item.status === "registration_open").length;
  const beginnerCount = tournaments.filter((item) => item.levelTags.includes("beginner") || item.levelTags.includes("novice")).length;
  const feeCount = tournaments.filter((item) => typeof item.feeAmount === "number").length;
  const healthySources = sources.filter((item) => item.state === "healthy").length;

  return [
    {
      id: "open",
      label: "지금 접수중",
      value: `${openCount}개`,
      hint: "마감 전에 바로 비교할 수 있는 대회 수"
    },
    {
      id: "beginner",
      label: "입문자 친화",
      value: `${beginnerCount}개`,
      hint: "신인/루키/비우승자 중심으로 해석한 대회"
    },
    {
      id: "fees",
      label: "참가비 확인 완료",
      value: `${feeCount}개`,
      hint: "참가비가 구조화되어 바로 보이는 항목"
    },
    {
      id: "sources",
      label: "활성 소스",
      value: `${healthySources}/${Math.max(sources.length, 1)}`,
      hint: "라이브 동기화 성공 기준"
    }
  ];
}

function buildReviewQueue(tournaments: TennisTournament[]): TennisReviewItem[] {
  const items: TennisReviewItem[] = [];

  tournaments.forEach((tournament) => {
    if (!tournament.feeText) {
      items.push(createReviewItem(tournament, "missing_fee", "참가비 원문이 없어 수동 확인이 필요합니다."));
    }

    if (!tournament.rawEligibility) {
      items.push(createReviewItem(tournament, "missing_eligibility", "참가 자격 설명이 비어 있습니다."));
    }

    if (tournament.sourceConfidence < 0.78) {
      items.push(createReviewItem(tournament, "low_confidence", "구조화 신뢰도가 낮아 원문 검수가 필요합니다."));
    }

    if (tournament.sourceRefs.length > 1) {
      items.push(createReviewItem(tournament, "duplicate_merge", "여러 소스에서 수집되어 병합 결과를 확인하면 좋습니다."));
    }
  });

  return items.slice(0, 12);
}

function createReviewItem(tournament: TennisTournament, kind: TennisReviewItem["kind"], reason: string): TennisReviewItem {
  return {
    id: `${tournament.id}-${kind}`,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    kind,
    reason,
    sourceIds: tournament.sourceRefs.map((reference) => reference.sourceId),
    createdAt: tournament.sourceUpdatedAt
  };
}

function applyFilters(tournaments: TennisTournament[], filters: TournamentFilters) {
  return tournaments.filter((tournament) => {
    if (filters.query) {
      const haystack = `${tournament.name} ${tournament.venue ?? ""} ${tournament.organizer ?? ""} ${tournament.rawEligibility}`.toLowerCase();
      if (!haystack.includes(filters.query.toLowerCase())) {
        return false;
      }
    }

    if (filters.region && filters.region !== "전체" && tournament.region !== filters.region) {
      return false;
    }

    if (filters.level && filters.level !== "전체" && !tournament.levelTags.includes(filters.level as never)) {
      return false;
    }

    if (filters.ranking && filters.ranking !== "전체") {
      if (filters.ranking === "ranked" && tournament.rankingType !== "ranked") {
        return false;
      }

      if (filters.ranking === "non_ranked" && tournament.rankingType !== "non_ranked") {
        return false;
      }
    }

    if (filters.format && filters.format !== "전체" && !tournament.formatTags.includes(filters.format as never)) {
      return false;
    }

    if (filters.status && filters.status !== "전체" && tournament.status !== filters.status) {
      return false;
    }

    if (filters.fee && filters.fee !== "전체") {
      const amount = tournament.feeAmount ?? Number.POSITIVE_INFINITY;

      if (filters.fee === "under_60000" && amount >= 60000) {
        return false;
      }

      if (filters.fee === "between_60000_90000" && (amount < 60000 || amount > 90000)) {
        return false;
      }

      if (filters.fee === "over_90000" && amount <= 90000) {
        return false;
      }
    }

    return true;
  });
}

function sortTournaments(left: TennisTournament, right: TennisTournament) {
  if (left.status === "registration_open" && right.status !== "registration_open") {
    return -1;
  }

  if (left.status !== "registration_open" && right.status === "registration_open") {
    return 1;
  }

  return left.startDate.localeCompare(right.startDate);
}
