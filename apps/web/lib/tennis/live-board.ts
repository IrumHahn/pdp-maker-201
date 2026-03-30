import {
  TENNIS_SOURCE_DEFINITIONS,
  type TennisAdminBoardResponse,
  type TennisBoardMetric,
  type TennisRegistrationRoute,
  type TennisReviewItem,
  type TennisSourceId,
  type TennisSourceReference,
  type TennisSourceStatus,
  type TennisSyncRun,
  type TennisTournament
} from "@runacademy/shared";
import { TENNIS_FALLBACK_BOARD } from "../../components/tennis/demo-data";

type TennisRawTournamentRecord = {
  sourceId: TennisSourceId;
  sourceName: string;
  pageUrl: string;
  detailUrl?: string;
  registrationUrl?: string;
  registrationRoute: TennisRegistrationRoute;
  title: string;
  statusText?: string;
  startDateText?: string;
  endDateText?: string;
  feeText?: string;
  organizerText?: string;
  venueText?: string;
  contactText?: string;
  divisionsText?: string;
  eligibilityText?: string;
  notesText?: string;
  rawText: string;
  confidence: number;
};

type SourceFetchResult = {
  sourceId: TennisSourceId;
  records: TennisRawTournamentRecord[];
  status: TennisSourceStatus;
  run: TennisSyncRun;
};

type KtaListItem = {
  cmptEvntCd: string;
  cmptNm: string;
  cmptStrDt: string;
  cmptEndDt: string;
  applStrDt: string;
  applEndDt: string;
  dtlSt: string;
  placeNm?: string | null;
};

type KtaBasicInfo = {
  dtlSt?: string;
  cmptEvntCd?: string;
  cmptNm?: string;
  cmptGroupNm?: string;
};

type KtaEventInfo = {
  cmptPlace?: string;
  cmptHost?: string;
  cmptOrg?: string;
  entryFeeTxt?: string;
  partAppl?: string;
  applDeadline?: string;
  contactUs?: string;
  awardTxt?: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
};
const KATO_LIST_URL = "https://kato.kr/openList";
const KTA_LIST_URL = "https://join.kortennis.or.kr/sportsForAll/sportsForAll_selList.json";
const KTA_DETAIL_PAGE_URL = "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do";
const KTA_BASIC_INFO_URL = "https://join.kortennis.or.kr/sportsForAll/sportsForAll_selBasicInfo.json";
const KTA_EVENT_INFO_URL = "https://join.kortennis.or.kr/sportsForAll/sportsForAll_selEventInfoList.json";
const SPORTS_DIARY_LIST_URL = "https://tennis.sportsdiary.co.kr/tennis/M_Player/ajax/Main_Match_List.asp";
const CACHE_TTL_MS = 15 * 60 * 1000;

let boardCache:
  | {
      fetchedAt: number;
      response: TennisAdminBoardResponse;
    }
  | null = null;

export async function getLiveTennisBoardResponse(): Promise<TennisAdminBoardResponse> {
  if (boardCache && Date.now() - boardCache.fetchedAt < CACHE_TTL_MS) {
    return boardCache.response;
  }

  const definitionMap = new Map(TENNIS_SOURCE_DEFINITIONS.map((definition) => [definition.id, definition]));
  const sourceStatuses = new Map<TennisSourceId, TennisSourceStatus>();

  TENNIS_SOURCE_DEFINITIONS.forEach((definition) => {
    sourceStatuses.set(definition.id, {
      ...definition,
      state: "idle",
      recordCount: 0
    });
  });

  const sourceResults = await Promise.allSettled([fetchKatoSource(), fetchKtaSource(), fetchSportsDiaryStatus()]);
  const allRecords: TennisTournament[] = [];
  const recentRuns: TennisSyncRun[] = [];

  sourceResults.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }

    const { records, status, run } = result.value;
    allRecords.push(...records.map((record) => normalizeRecord(record, status.lastSuccessfulSyncAt ?? status.lastSyncAt ?? nowIso())));
    sourceStatuses.set(status.id, status);
    recentRuns.push(run);
  });

  const tournaments = filterRecentTournaments(dedupeEntries(allRecords));
  const hasMeaningfulLiveData = tournaments.length >= 8;

  if (!hasMeaningfulLiveData) {
    const fallbackResponse: TennisAdminBoardResponse = {
      ok: true,
      board: TENNIS_FALLBACK_BOARD
    };
    boardCache = {
      fetchedAt: Date.now(),
      response: fallbackResponse
    };
    return fallbackResponse;
  }

  const response: TennisAdminBoardResponse = {
    ok: true,
    board: {
      generatedAt: nowIso(),
      metrics: buildMetrics(tournaments, Array.from(sourceStatuses.values())),
      featured: tournaments.slice(0, 4),
      tournaments,
      sources: Array.from(sourceStatuses.values()).sort((left, right) => left.priority - right.priority),
      reviewQueue: buildReviewQueue(tournaments),
      recentRuns: recentRuns.sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    }
  };

  boardCache = {
    fetchedAt: Date.now(),
    response
  };

  return response;
}

async function fetchKatoSource(): Promise<SourceFetchResult> {
  const definition = requireDefinition("kato");
  const startedAt = nowIso();
  const html = await fetchText(KATO_LIST_URL);

  if (!html) {
    return buildSourceFailure(definition.id, startedAt, "KATO 공개 페이지 응답을 받지 못했습니다.");
  }

  const summaryRecords = parseKatoListHtml(html);
  const detailedRecords = await mapWithConcurrency(summaryRecords, 4, async (record) => {
    if (!record.detailUrl) {
      return record;
    }

    const detailHtml = await fetchText(record.detailUrl);
    if (!detailHtml) {
      return record;
    }

    const rows = extractTableRows(detailHtml);
    return {
      ...record,
      feeText: pickRowValue(rows, "참가비") ?? record.feeText,
      organizerText: pickRowValue(rows, "주 최") ?? record.organizerText,
      venueText: pickRowValue(rows, "장 소") ?? record.venueText,
      contactText: pickRowValue(rows, "감독관 및 문의처") ?? record.contactText,
      divisionsText: pickRowValue(rows, "출전규정") ?? record.divisionsText,
      eligibilityText: pickRowValue(rows, "출전규정") ?? record.eligibilityText,
      notesText: pickRowValue(rows, "환불마감") ?? pickRowValue(rows, "신청안내 및 입금계좌") ?? record.notesText,
      rawText: `${record.rawText} ${stripHtml(detailHtml)}`.trim(),
      confidence: 0.94
    };
  });

  const completedAt = nowIso();

  return {
    sourceId: definition.id,
    records: detailedRecords,
    status: {
      ...definition,
      state: detailedRecords.length > 0 ? "healthy" : "warning",
      lastSyncAt: completedAt,
      lastSuccessfulSyncAt: completedAt,
      lastMode: detailedRecords.length > 0 ? "live_fetch" : "fallback_fixture",
      recordCount: detailedRecords.length,
      note: detailedRecords.length > 0 ? "KATO 공개 일정과 요강을 실시간 수집했습니다." : "KATO 응답은 받았지만 목록을 구조화하지 못했습니다."
    },
    run: {
      id: `${definition.id}-${completedAt}`,
      requestedSourceId: definition.id,
      startedAt,
      completedAt,
      success: detailedRecords.length > 0,
      syncedCount: detailedRecords.length,
      snapshotCount: detailedRecords.length,
      mode: detailedRecords.length > 0 ? "live_fetch" : "fallback_fixture",
      message: detailedRecords.length > 0 ? "KATO 실시간 동기화 완료" : "KATO 실시간 동기화 실패"
    }
  };
}

async function fetchKtaSource(): Promise<SourceFetchResult> {
  const definition = requireDefinition("kta_ranking");
  const relayDefinition = requireDefinition("kta_relay");
  const startedAt = nowIso();
  const params = new URLSearchParams({
    cmptDtlGb: "02",
    sidoCd: "ALL",
    sigunguCd: "ALL",
    cmptStat: "",
    cmptNm: "",
    type: "4",
    year: getCurrentKoreaYear(),
    month: getCurrentKoreaMonth(),
    strDt: `${getCurrentKoreaYear()}-01-01`,
    endDt: `${Number(getCurrentKoreaYear()) + 1}-12-21`,
    selectSize: "100",
    cntGbn: "",
    pageIndex: "1"
  });

  const response = await fetch(`${KTA_LIST_URL}?${params.toString()}`, {
    headers: DEFAULT_HEADERS,
    cache: "no-store"
  });

  if (!response.ok) {
    return buildSourceFailure(definition.id, startedAt, "KTA 공개 목록 JSON 응답을 받지 못했습니다.", relayDefinition);
  }

  const payload = (await response.json()) as { list?: KtaListItem[] };
  const list = Array.isArray(payload.list) ? payload.list : [];

  const records = await mapWithConcurrency(list, 4, async (item) => {
    const detail = await fetchKtaDetail(item.cmptEvntCd);
    const detailUrl = `${KTA_DETAIL_PAGE_URL}?cmptEvntCd=${item.cmptEvntCd}&dtlSt=Tab1`;
    const sourceName = definition.name;
    const organizer = [detail.eventInfo?.cmptHost, detail.eventInfo?.cmptOrg].filter(Boolean).join(", ");
    const divisionText = detail.basicInfo?.cmptGroupNm?.trim() || item.cmptNm;
    const applicationText = detail.eventInfo?.partAppl?.trim();
    const noteParts = [detail.eventInfo?.applDeadline?.trim(), applicationText].filter(Boolean);

    return {
      sourceId: definition.id,
      sourceName,
      pageUrl: definition.homepageUrl,
      detailUrl,
      registrationUrl: detailUrl,
      registrationRoute: detail.eventInfo?.partAppl?.includes("테니스타운") ? ("app" as const) : ("website" as const),
      title: item.cmptNm,
      statusText: item.dtlSt,
      startDateText: normalizeKtaDateLabel(item.cmptStrDt),
      endDateText: normalizeKtaDateLabel(item.cmptEndDt),
      feeText: detail.eventInfo?.entryFeeTxt,
      organizerText: organizer || undefined,
      venueText: detail.eventInfo?.cmptPlace ?? item.placeNm ?? undefined,
      contactText: detail.eventInfo?.contactUs,
      divisionsText: divisionText,
      eligibilityText: divisionText,
      notesText: noteParts.join(" / ") || normalizeKtaDateLabel(item.applEndDt),
      rawText: [
        item.cmptNm,
        item.dtlSt,
        item.cmptStrDt,
        item.cmptEndDt,
        detail.eventInfo?.cmptPlace,
        detail.eventInfo?.entryFeeTxt,
        applicationText,
        detail.eventInfo?.contactUs
      ]
        .filter(Boolean)
        .join(" "),
      confidence: detail.eventInfo ? 0.92 : 0.84
    } satisfies TennisRawTournamentRecord;
  });

  const completedAt = nowIso();

  return {
    sourceId: definition.id,
    records,
    status: {
      ...definition,
      state: records.length > 0 ? "healthy" : "warning",
      lastSyncAt: completedAt,
      lastSuccessfulSyncAt: completedAt,
      lastMode: records.length > 0 ? "live_fetch" : "fallback_fixture",
      recordCount: records.length,
      note: records.length > 0 ? "KTA 공개 목록 JSON과 대회요강 상세를 실시간 수집했습니다." : "KTA 목록은 열렸지만 대회를 읽어오지 못했습니다."
    },
    run: {
      id: `${definition.id}-${completedAt}`,
      requestedSourceId: definition.id,
      startedAt,
      completedAt,
      success: records.length > 0,
      syncedCount: records.length,
      snapshotCount: records.length,
      mode: records.length > 0 ? "live_fetch" : "fallback_fixture",
      message: records.length > 0 ? "KTA 실시간 동기화 완료" : "KTA 실시간 동기화 실패"
    }
  };
}

async function fetchSportsDiaryStatus(): Promise<SourceFetchResult> {
  const definition = requireDefinition("sports_diary");
  const startedAt = nowIso();
  const html = await fetchText(SPORTS_DIARY_LIST_URL);
  const completedAt = nowIso();
  const noSchedule = Boolean(html && html.includes("등록된 대회일정이 없습니다."));

  return {
    sourceId: definition.id,
    records: [],
    status: {
      ...definition,
      state: noSchedule ? "warning" : "idle",
      lastSyncAt: completedAt,
      lastSuccessfulSyncAt: completedAt,
      lastMode: noSchedule ? "live_fetch" : "fallback_fixture",
      recordCount: 0,
      note: noSchedule ? "공개 메인 목록 기준 등록된 대회 일정이 없습니다." : "공개 메인 목록을 실시간으로 읽지 못했습니다."
    },
    run: {
      id: `${definition.id}-${completedAt}`,
      requestedSourceId: definition.id,
      startedAt,
      completedAt,
      success: noSchedule,
      syncedCount: 0,
      snapshotCount: 0,
      mode: noSchedule ? "live_fetch" : "fallback_fixture",
      message: noSchedule ? "스포츠다이어리 공개 상태 확인 완료" : "스포츠다이어리 공개 상태 확인 실패"
    }
  };
}

async function fetchKtaDetail(cmptEvntCd: string) {
  try {
    const detailPage = await fetch(`${KTA_DETAIL_PAGE_URL}?cmptEvntCd=${cmptEvntCd}&dtlSt=Tab1`, {
      headers: DEFAULT_HEADERS,
      cache: "no-store"
    });
    const setCookie = detailPage.headers.get("set-cookie") ?? "";
    const sessionCookie = setCookie.match(/JSESSIONID=[^;]+/)?.[0] ?? "";

    const basicInfoResponse = await fetch(KTA_BASIC_INFO_URL, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {})
      },
      body: JSON.stringify({ cmptEvntCd }),
      cache: "no-store"
    });
    const eventInfoResponse = await fetch(KTA_EVENT_INFO_URL, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {})
      },
      body: JSON.stringify({ cmptEvntCd }),
      cache: "no-store"
    });

    const basicPayload = basicInfoResponse.ok ? ((await basicInfoResponse.json()) as { basicInfo?: KtaBasicInfo }) : {};
    const eventPayload = eventInfoResponse.ok ? ((await eventInfoResponse.json()) as { list?: KtaEventInfo[] }) : {};

    return {
      basicInfo: basicPayload.basicInfo,
      eventInfo: Array.isArray(eventPayload.list) ? eventPayload.list[0] : undefined
    };
  } catch {
    return {
      basicInfo: undefined,
      eventInfo: undefined
    };
  }
}

function parseKatoListHtml(html: string): TennisRawTournamentRecord[] {
  const blocks = Array.from(html.matchAll(/<table>[\s\S]*?<\/table>/gi)).map((match) => match[0]);
  const records: TennisRawTournamentRecord[] = [];

  blocks.forEach((block) => {
    const href = extractMatch(block, /<a href="([^"]+)" class="content-title">/i);
    const title = stripHtml(extractMatch(block, /<div class="title">[\s\S]*?<a [^>]*class="content-title">([\s\S]*?)<\/a>/i) ?? "");
    const parts = stripHtml(extractMatch(block, /<span class="parts">([\s\S]*?)<\/span>/i) ?? "");
    const dateText = stripHtml(extractMatch(block, /<div class="date">([\s\S]*?)<\/div>/i) ?? "");
    const statusText = stripHtml(extractMatch(block, /<span class="com[^"]+">([\s\S]*?)<\/span>/i) ?? "");

    if (!href || !title || !dateText) {
      return;
    }

    const detailUrl = toAbsoluteUrl("https://kato.kr", href);
    records.push({
      sourceId: "kato",
      sourceName: "KATO",
      pageUrl: KATO_LIST_URL,
      detailUrl,
      registrationUrl: detailUrl,
      registrationRoute: "website",
      title,
      statusText,
      startDateText: dateText,
      endDateText: dateText,
      divisionsText: parts,
      eligibilityText: parts,
      rawText: stripHtml(block),
      confidence: 0.82
    });
  });

  return records;
}

function extractTableRows(html: string) {
  return Array.from(html.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map((match) => {
    const cells = Array.from(match[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) => stripHtml(cell[1]));
    return {
      cells
    };
  });
}

function pickRowValue(rows: Array<{ cells: string[] }>, label: string) {
  const normalizedLabel = normalizeLabel(label);
  const row = rows.find((candidate) => normalizeLabel(candidate.cells[0] ?? "") === normalizedLabel);
  if (!row || row.cells.length < 2) {
    return undefined;
  }

  return row.cells[row.cells.length - 1]?.trim() || undefined;
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
    id: buildFingerprint(record.title, startDate, venue, organizer),
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

function filterRecentTournaments(tournaments: TennisTournament[]) {
  const cutoff = addDays(koreaToday(), -14);
  return tournaments
    .filter((item) => item.status !== "ended" && item.endDate >= cutoff)
    .sort(sortTournaments);
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

  return Array.from(merged.values());
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
      hint: "현재 신청 가능으로 판별된 대회"
    },
    {
      id: "beginner",
      label: "입문자 친화",
      value: `${beginnerCount}개`,
      hint: "신인, 루키, 일반 동호인 중심으로 해석된 대회"
    },
    {
      id: "fees",
      label: "참가비 확인 완료",
      value: `${feeCount}개`,
      hint: "요강에서 참가비를 직접 읽은 대회"
    },
    {
      id: "sources",
      label: "활성 소스",
      value: `${healthySources}/${Math.max(sources.length, 1)}`,
      hint: "실시간 동기화 성공 기준"
    }
  ];
}

function buildReviewQueue(tournaments: TennisTournament[]): TennisReviewItem[] {
  const items: TennisReviewItem[] = [];

  tournaments.forEach((tournament) => {
    if (!tournament.feeText) {
      items.push(createReviewItem(tournament, "missing_fee", "참가비가 없어 원문 확인이 필요합니다."));
    }

    if (!tournament.rawEligibility) {
      items.push(createReviewItem(tournament, "missing_eligibility", "참가 기준 설명이 비어 있습니다."));
    }

    if (tournament.sourceConfidence < 0.8) {
      items.push(createReviewItem(tournament, "low_confidence", "대회 구조화 신뢰도가 낮아 재확인이 필요합니다."));
    }

    if (tournament.sourceRefs.length > 1) {
      items.push(createReviewItem(tournament, "duplicate_merge", "여러 소스가 병합되어 결과 확인이 필요합니다."));
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

function sortTournaments(left: TennisTournament, right: TennisTournament) {
  if (left.status === "registration_open" && right.status !== "registration_open") {
    return -1;
  }

  if (left.status !== "registration_open" && right.status === "registration_open") {
    return 1;
  }

  return left.startDate.localeCompare(right.startDate);
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

function buildSourceFailure(
  sourceId: TennisSourceId,
  startedAt: string,
  note: string,
  secondaryDefinition?: (typeof TENNIS_SOURCE_DEFINITIONS)[number]
): SourceFetchResult {
  const definition = requireDefinition(sourceId);
  const completedAt = nowIso();

  if (secondaryDefinition) {
    boardCache = null;
  }

  return {
    sourceId,
    records: [],
    status: {
      ...definition,
      state: "warning",
      lastSyncAt: completedAt,
      lastMode: "fallback_fixture",
      lastError: note,
      recordCount: 0,
      note
    },
    run: {
      id: `${definition.id}-${completedAt}`,
      requestedSourceId: definition.id,
      startedAt,
      completedAt,
      success: false,
      syncedCount: 0,
      snapshotCount: 0,
      mode: "fallback_fixture",
      message: note
    }
  };
}

function requireDefinition(sourceId: TennisSourceId) {
  const definition = TENNIS_SOURCE_DEFINITIONS.find((item) => item.id === sourceId);
  if (!definition) {
    throw new Error(`Unknown tennis source: ${sourceId}`);
  }

  return definition;
}

function extractMatch(value: string, expression: RegExp) {
  return value.match(expression)?.[1];
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    const mapped = await Promise.all(chunk.map((item) => mapper(item)));
    results.push(...mapped);
  }

  return results;
}

function normalizeKtaDateLabel(value: string) {
  return value.replace(/\([^)]+\)/g, "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function koreaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00+09:00`);
  date.setDate(date.getDate() + amount);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getCurrentKoreaYear() {
  return koreaToday().slice(0, 4);
}

function getCurrentKoreaMonth() {
  return koreaToday().slice(5, 7);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|tr|li|table|h\d|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseFeeAmount(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/,/g, "").replace(/\s+/g, "");
  const digitMatch = normalized.match(/(\d{2,7})원/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const koreanAmountMatch = normalized.match(/(?:(\d+)만)?(?:(\d+)천)?원/);
  if (koreanAmountMatch) {
    const man = Number(koreanAmountMatch[1] ?? 0) * 10000;
    const thousand = Number(koreanAmountMatch[2] ?? 0) * 1000;
    const valueFromUnits = man + thousand;
    if (valueFromUnits > 0) {
      return valueFromUnits;
    }
  }

  return undefined;
}

function parseDateRange(value: string) {
  const normalized = value.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
  const rangeMatch = normalized.match(
    /(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})\s*일?\s*(?:~|-|–|—)\s*(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/
  );

  if (rangeMatch) {
    return {
      startDate: toIsoDate(rangeMatch[1], rangeMatch[2], rangeMatch[3]),
      endDate: toIsoDate(rangeMatch[4], rangeMatch[5], rangeMatch[6])
    };
  }

  const singleMatch = normalized.match(/(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/);
  if (singleMatch) {
    const iso = toIsoDate(singleMatch[1], singleMatch[2], singleMatch[3]);
    return { startDate: iso, endDate: iso };
  }

  return {
    startDate: koreaToday(),
    endDate: koreaToday()
  };
}

function parseDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})(?:\s*일?)?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) {
    return undefined;
  }

  const date = toIsoDate(match[1], match[2], match[3]);
  const hour = String(Number(match[4] ?? 0)).padStart(2, "0");
  const minute = String(Number(match[5] ?? 0)).padStart(2, "0");
  return `${date}T${hour}:${minute}:00+09:00`;
}

function inferRankingType(value: string) {
  const text = value.toLowerCase();

  if (text.includes("비랭킹")) {
    return "non_ranked" as const;
  }

  if (text.includes("랭킹")) {
    return "ranked" as const;
  }

  return "mixed" as const;
}

function inferLevelTags(value: string, rankingType: TennisTournament["rankingType"]) {
  const text = value.toLowerCase();
  const levels = new Set<TennisTournament["levelTags"][number]>();

  if (rankingType === "ranked") {
    levels.add("ranked");
  }

  if (rankingType === "non_ranked") {
    levels.add("non_ranked");
  }

  if (/루키|입문|신인|ntrp 3\.0 이하/.test(text)) {
    levels.add("beginner");
  }

  if (/개나리|국화|여자복식|여성|어머니/.test(text)) {
    levels.add("women");
  }

  if (/시니어|베테랑|장년|만 60세|만60세/.test(text)) {
    levels.add("senior");
  }

  if (/챌린저|3\.0|4\.0|중급/.test(text)) {
    levels.add("intermediate");
  }

  if (/오픈부|지도자|마스터|5\.0|6\.0/.test(text)) {
    levels.add("advanced");
    levels.add("open");
  }

  if (levels.size === 0) {
    levels.add("novice");
  }

  return Array.from(levels);
}

function inferFormatTags(value: string) {
  const text = value.toLowerCase();
  const formats = new Set<TennisTournament["formatTags"][number]>();

  if (/혼합|혼복|mixed/.test(text)) {
    formats.add("mixed_doubles");
  }

  if (/여자복식|개나리|국화|어머니/.test(text)) {
    formats.add("women_doubles");
  }

  if (/남자복식/.test(text)) {
    formats.add("men_doubles");
  }

  if (/단식/.test(text)) {
    formats.add("singles");
  }

  if (/복식|부서|페어|동호인/.test(text) || formats.size === 0) {
    formats.add("doubles");
  }

  return Array.from(formats);
}

function summarizeFormats(tags: TennisTournament["formatTags"]) {
  if (tags.includes("mixed_doubles")) {
    return "복식 중심, 혼합복식 포함";
  }

  if (tags.includes("singles") && tags.includes("doubles")) {
    return "단식과 복식 동시 운영";
  }

  if (tags.includes("women_doubles")) {
    return "여성 복식 중심";
  }

  if (tags.includes("doubles")) {
    return "복식 중심";
  }

  return "경기 형식 확인 필요";
}

function inferGenderSummary(value: string) {
  if (/여자|개나리|국화|어머니/.test(value)) {
    return "여성 부서 포함";
  }

  if (/혼합|혼복/.test(value)) {
    return "혼합복식 가능";
  }

  return undefined;
}

function inferAgeSummary(value: string) {
  const explicit = value.match(/만\s?(\d{2})세\s?이상/);
  if (explicit) {
    return `만 ${explicit[1]}세 이상 참가 가능`;
  }

  if (/시니어|베테랑|장년/.test(value)) {
    return "연령 제한 부서 포함";
  }

  return undefined;
}

function inferRegion(value: string) {
  const candidates = [
    { region: "서울", tokens: ["서울", "올림픽공원", "광명"] },
    { region: "경기", tokens: ["경기", "수원", "하남", "파주", "광명"] },
    { region: "인천", tokens: ["인천", "송도"] },
    { region: "충북", tokens: ["음성", "충북"] },
    { region: "충남", tokens: ["천안", "부여", "예산", "충남", "아산"] },
    { region: "대전", tokens: ["대전"] },
    { region: "강원", tokens: ["횡성", "삼척", "강원"] },
    { region: "경북", tokens: ["문경", "상주", "안동", "구미", "예천", "경북"] },
    { region: "경남", tokens: ["진주", "창원", "통영", "경남"] },
    { region: "전북", tokens: ["익산", "전북"] },
    { region: "전남", tokens: ["광양", "여수", "전남"] },
    { region: "부산", tokens: ["부산", "사직"] },
    { region: "대구", tokens: ["대구", "달성"] }
  ];

  for (const candidate of candidates) {
    if (candidate.tokens.some((token) => value.includes(token))) {
      return candidate.region;
    }
  }

  return "전국";
}

function inferCity(value: string) {
  const match = value.match(/(서울|수원|하남|문경|천안|부산|인천|파주|부여|상주|익산|음성|창원|광양|예천|대전|안동|통영|횡성|진주|구미|대구|달성|아산|예산)/);
  return match?.[1];
}

function mapTournamentStatus(value: string, startDate: string, endDate: string) {
  const text = value.toLowerCase();
  const today = koreaToday();

  if (text.includes("접수중") || text.includes("신청중")) {
    return "registration_open" as const;
  }

  if (text.includes("준비")) {
    return "upcoming" as const;
  }

  if (text.includes("마감") || text.includes("종료")) {
    return endDate < today ? ("ended" as const) : ("registration_closed" as const);
  }

  if (startDate > today) {
    return "upcoming" as const;
  }

  if (endDate < today) {
    return "ended" as const;
  }

  return "live" as const;
}

function formatStatusLabel(status: TennisTournament["status"]) {
  switch (status) {
    case "registration_open":
      return "접수중";
    case "upcoming":
      return "접수예정";
    case "registration_closed":
      return "접수마감";
    case "live":
      return "진행중";
    case "ended":
      return "종료";
  }
}

function summarizeEligibility(levelTags: TennisTournament["levelTags"], rawEligibility: string, rankingType: TennisTournament["rankingType"]) {
  const parts: string[] = [];

  if (levelTags.includes("beginner")) {
    parts.push("입문자도 검토 가능한 부서 포함");
  } else if (levelTags.includes("intermediate")) {
    parts.push("동호인 중급 이상 중심");
  } else if (levelTags.includes("advanced") || levelTags.includes("open")) {
    parts.push("오픈부 또는 상급자 중심");
  }

  if (levelTags.includes("women")) {
    parts.push("여성 부서 운영");
  }

  if (levelTags.includes("senior")) {
    parts.push("시니어 연령 조건 포함");
  }

  if (rankingType === "ranked") {
    parts.push("랭킹 포인트 반영");
  } else if (rankingType === "non_ranked") {
    parts.push("비랭킹 이벤트");
  }

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return rawEligibility || "참가 자격은 원문 요강 확인";
}

function buildRegistrationHint(route: TennisRegistrationRoute, sourceName: string) {
  if (route === "app") {
    return `${sourceName} 외부 앱 또는 전용 흐름으로 이동`;
  }

  if (route === "manual_contact") {
    return `${sourceName} 공지의 문의처로 직접 확인 필요`;
  }

  return `${sourceName} 원출처 페이지에서 신청`;
}

function buildFingerprint(name: string, startDate: string, venue?: string, organizer?: string) {
  const normalized = [name, startDate, venue ?? "", organizer ?? ""]
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, " "))
    .join("|");

  return slugify(normalized);
}

function buildFreshnessLabel(value: string) {
  const diffHours = Math.max(1, Math.round((Date.now() - Date.parse(value)) / 36e5));

  if (diffHours < 24) {
    return `${diffHours}시간 전 갱신`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}일 전 갱신`;
}

function toAbsoluteUrl(origin: string, path: string) {
  return path.startsWith("http") ? path : `${origin}${path}`;
}

function toIsoDate(year: string, month: string, day: string) {
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").trim();
}
