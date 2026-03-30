import {
  TENNIS_SOURCE_DEFINITIONS,
  type TennisRawTournamentRecord,
  type TennisSourceDefinition,
  type TennisSourceId,
  type TennisSourceSnapshot,
  type TennisSyncMode
} from "@runacademy/shared";
import {
  KATO_DETAIL_FIXTURES,
  KATO_LIST_FIXTURE,
  KTA_RANKING_FIXTURE,
  KTA_RELAY_FIXTURE,
  REGIONAL_MANUAL_FIXTURE,
  SPORTS_DIARY_FIXTURE
} from "./tennis.fixtures";
import {
  buildExcerpt,
  extractHref,
  extractInnerText,
  extractTableValue,
  extractTaggedBlocks,
  nowIso,
  stripHtml
} from "./tennis.utils";

export interface TennisConnectorResult {
  sourceId: TennisSourceId;
  mode: TennisSyncMode;
  records: TennisRawTournamentRecord[];
  snapshots: TennisSourceSnapshot[];
  note?: string;
}

export interface TennisConnector {
  definition: TennisSourceDefinition;
  sync(): Promise<TennisConnectorResult>;
}

export function createTennisConnectors() {
  return {
    kato: new KatoConnector(findDefinition("kato")),
    kta_ranking: new KtaRankingConnector(findDefinition("kta_ranking")),
    kta_relay: new KtaRelayConnector(findDefinition("kta_relay")),
    sports_diary: new SportsDiaryConnector(findDefinition("sports_diary")),
    regional_manual: new RegionalManualConnector(findDefinition("regional_manual"))
  } satisfies Record<TennisSourceId, TennisConnector>;
}

export function parseKatoRecords(html: string) {
  return extractTaggedBlocks(html, "tournament-card").map((block) => {
    const title = extractInnerText(block, "title");
    const detail = KATO_DETAIL_FIXTURES[title] ?? "";
    return {
      sourceId: "kato" as const,
      sourceName: "KATO",
      pageUrl: findDefinition("kato").homepageUrl,
      detailUrl: extractHref(block, "title"),
      registrationUrl: extractHref(block, "title"),
      registrationRoute: "website" as const,
      title,
      statusText: extractInnerText(block, "status"),
      startDateText: extractInnerText(block, "date"),
      endDateText: extractInnerText(block, "date"),
      feeText: extractTableValue(detail, "참가비"),
      organizerText: extractTableValue(detail, "주 최"),
      venueText: extractTableValue(detail, "장 소"),
      contactText: extractTableValue(detail, "감독관 및 문의처"),
      divisionsText: `${extractInnerText(block, "group")} / ${extractTableValue(detail, "출전규정")}`.trim(),
      eligibilityText: extractTableValue(detail, "출전규정"),
      notesText: extractTableValue(detail, "신청마감"),
      rawText: `${stripHtml(block)} ${stripHtml(detail)}`,
      confidence: detail ? 0.92 : 0.76
    };
  });
}

export function parseKtaRankingRecords(html: string) {
  return extractTaggedBlocks(html.replace(/<tr class="event-row"/g, '<article class="event-row"').replace(/<\/tr>/g, "</article>"), "event-row").map(
    (block) => ({
      sourceId: "kta_ranking" as const,
      sourceName: "KTA 생활체육 랭킹",
      pageUrl: findDefinition("kta_ranking").homepageUrl,
      detailUrl: extractHref(block, "title"),
      registrationUrl: "https://join.kortennis.or.kr/community/boardDetail.do?_code=10100&articleSeq=2205&boardNm=notice&boardSeq=2",
      registrationRoute: "app" as const,
      title: extractInnerText(block, "title"),
      statusText: extractInnerText(block, "status"),
      startDateText: extractInnerText(block, "date"),
      endDateText: extractInnerText(block, "date"),
      feeText: extractInnerText(block, "fee"),
      organizerText: extractInnerText(block, "host"),
      venueText: extractInnerText(block, "place"),
      divisionsText: extractInnerText(block, "detail"),
      eligibilityText: extractInnerText(block, "detail"),
      notesText: "2026-03-03부터 테니스타운 앱 신청 경로 반영",
      rawText: stripHtml(block),
      confidence: 0.88
    })
  );
}

export function parseKtaRelayRecords(html: string) {
  return extractTaggedBlocks(html, "relay-card").map((block) => ({
    sourceId: "kta_relay" as const,
    sourceName: "KTA 생활체육 신청",
    pageUrl: findDefinition("kta_relay").homepageUrl,
    detailUrl: extractHref(block, "title"),
    registrationUrl: extractHref(block, "title"),
    registrationRoute: "website" as const,
    title: extractInnerText(block, "title"),
    statusText: extractInnerText(block, "status"),
    startDateText: extractInnerText(block, "date"),
    endDateText: extractInnerText(block, "date"),
    feeText: extractInnerText(block, "fee"),
    organizerText: extractInnerText(block, "host"),
    venueText: extractInnerText(block, "place"),
    divisionsText: extractInnerText(block, "rules"),
    eligibilityText: extractInnerText(block, "rules"),
    rawText: stripHtml(block),
    confidence: 0.84
  }));
}

export function parseSportsDiaryRecords(html: string) {
  return extractTaggedBlocks(html, "sd-card").map((block) => ({
    sourceId: "sports_diary" as const,
    sourceName: "스포츠다이어리",
    pageUrl: findDefinition("sports_diary").homepageUrl,
    detailUrl: extractHref(block, "title"),
    registrationUrl: extractHref(block, "title"),
    registrationRoute: "app" as const,
    title: extractInnerText(block, "title"),
    statusText: extractInnerText(block, "status"),
    startDateText: extractInnerText(block, "date"),
    endDateText: extractInnerText(block, "date"),
    feeText: extractInnerText(block, "fee"),
    organizerText: extractInnerText(block, "host"),
    venueText: extractInnerText(block, "place"),
    divisionsText: extractInnerText(block, "rules"),
    eligibilityText: extractInnerText(block, "rules"),
    rawText: stripHtml(block),
    confidence: 0.86
  }));
}

export function parseRegionalRecords(html: string) {
  return extractTaggedBlocks(html, "regional-post").map((block) => ({
    sourceId: "regional_manual" as const,
    sourceName: "지역/시니어 보강",
    pageUrl: findDefinition("regional_manual").homepageUrl,
    detailUrl: extractHref(block, "title"),
    registrationRoute: "manual_contact" as const,
    title: extractInnerText(block, "title"),
    statusText: extractInnerText(block, "status"),
    startDateText: extractInnerText(block, "date"),
    endDateText: extractInnerText(block, "date"),
    feeText: extractInnerText(block, "fee"),
    organizerText: extractInnerText(block, "host"),
    venueText: extractInnerText(block, "place"),
    divisionsText: extractInnerText(block, "rules"),
    eligibilityText: extractInnerText(block, "rules"),
    rawText: stripHtml(block),
    confidence: 0.73
  }));
}

class KatoConnector implements TennisConnector {
  constructor(readonly definition: TennisSourceDefinition) {}

  async sync() {
    return this.syncWithFallback(KATO_LIST_FIXTURE, parseKatoRecords);
  }

  private async syncWithFallback(
    fallback: string,
    parser: (value: string) => TennisRawTournamentRecord[]
  ): Promise<TennisConnectorResult> {
    const live = await fetchText(this.definition.homepageUrl);
    const liveRecords = live ? parser(live) : [];
    const mode: TennisSyncMode = liveRecords.length > 0 ? "live_fetch" : "fallback_fixture";
    const sourceText = liveRecords.length > 0 ? live! : fallback;
    const records = liveRecords.length > 0 ? liveRecords : parser(fallback);
    return {
      sourceId: this.definition.id,
      mode,
      records,
      snapshots: [createSnapshot(this.definition.id, "대회일정 목록", this.definition.homepageUrl, sourceText, mode)],
      note: mode === "fallback_fixture" ? "라이브 파싱 실패로 대표 fixture를 사용했습니다." : undefined
    };
  }
}

class KtaRankingConnector implements TennisConnector {
  constructor(readonly definition: TennisSourceDefinition) {}

  async sync() {
    return syncSimpleFixtureConnector(this.definition, KTA_RANKING_FIXTURE, parseKtaRankingRecords, "랭킹대회 목록");
  }
}

class KtaRelayConnector implements TennisConnector {
  constructor(readonly definition: TennisSourceDefinition) {}

  async sync() {
    return syncSimpleFixtureConnector(this.definition, KTA_RELAY_FIXTURE, parseKtaRelayRecords, "비랭킹/랠리 목록");
  }
}

class SportsDiaryConnector implements TennisConnector {
  constructor(readonly definition: TennisSourceDefinition) {}

  async sync() {
    return syncSimpleFixtureConnector(this.definition, SPORTS_DIARY_FIXTURE, parseSportsDiaryRecords, "루키/플랫폼 대회");
  }
}

class RegionalManualConnector implements TennisConnector {
  constructor(readonly definition: TennisSourceDefinition) {}

  async sync() {
    return {
      sourceId: this.definition.id,
      mode: "manual_seed" as const,
      records: parseRegionalRecords(REGIONAL_MANUAL_FIXTURE),
      snapshots: [createSnapshot(this.definition.id, "지역/시니어 큐레이션", this.definition.homepageUrl, REGIONAL_MANUAL_FIXTURE, "manual_seed")],
      note: "수동 보강 소스에서 대표 공지를 적재했습니다."
    };
  }
}

async function syncSimpleFixtureConnector(
  definition: TennisSourceDefinition,
  fallback: string,
  parser: (value: string) => TennisRawTournamentRecord[],
  label: string
): Promise<TennisConnectorResult> {
  const live = await fetchText(definition.homepageUrl);
  const liveRecords = live ? parser(live) : [];
  const mode: TennisSyncMode = liveRecords.length > 0 ? "live_fetch" : "fallback_fixture";
  const sourceText = liveRecords.length > 0 ? live! : fallback;

  return {
    sourceId: definition.id,
    mode,
    records: liveRecords.length > 0 ? liveRecords : parser(fallback),
    snapshots: [createSnapshot(definition.id, label, definition.homepageUrl, sourceText, mode)],
    note: mode === "fallback_fixture" ? "대표 fixture로 데이터를 시드했습니다." : undefined
  };
}

function createSnapshot(
  sourceId: TennisSourceId,
  label: string,
  pageUrl: string,
  excerptSource: string,
  mode: TennisSyncMode
): TennisSourceSnapshot {
  const now = nowIso();
  return {
    id: `${sourceId}-${label}-${now}`,
    sourceId,
    label,
    pageUrl,
    collectedAt: now,
    mode,
    success: true,
    confidence: mode === "live_fetch" ? 0.9 : mode === "manual_seed" ? 0.8 : 0.72,
    excerpt: buildExcerpt(excerptSource)
  };
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function findDefinition(sourceId: TennisSourceId) {
  const found = TENNIS_SOURCE_DEFINITIONS.find((item) => item.id === sourceId);
  if (!found) {
    throw new Error(`Unknown tennis source definition: ${sourceId}`);
  }

  return found;
}
