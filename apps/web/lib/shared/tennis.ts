export type TennisSourceId = "kato" | "kta_ranking" | "kta_relay" | "sports_diary" | "regional_manual";

export type TennisSourceState = "idle" | "healthy" | "warning" | "error";
export type TennisSyncMode = "live_fetch" | "fallback_fixture" | "manual_seed";
export type TennisTournamentStatus = "registration_open" | "upcoming" | "registration_closed" | "live" | "ended";
export type TennisRankingType = "ranked" | "non_ranked" | "mixed";
export type TennisRegistrationRoute = "website" | "app" | "manual_contact";
export type TennisReviewKind = "missing_fee" | "missing_eligibility" | "low_confidence" | "duplicate_merge";
export type TennisLevelTag =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "open"
  | "senior"
  | "women"
  | "ranked"
  | "non_ranked";
export type TennisFormatTag = "singles" | "doubles" | "mixed_doubles" | "women_doubles" | "men_doubles";

export interface TennisSourceDefinition {
  id: TennisSourceId;
  name: string;
  homepageUrl: string;
  summary: string;
  priority: number;
  sourceType: "association" | "federation" | "platform" | "regional";
  registrationRoute: TennisRegistrationRoute;
}

export interface TennisSourceStatus extends TennisSourceDefinition {
  state: TennisSourceState;
  lastSyncAt?: string;
  lastSuccessfulSyncAt?: string;
  lastMode?: TennisSyncMode;
  recordCount: number;
  note?: string;
  lastError?: string;
}

export interface TennisSourceReference {
  sourceId: TennisSourceId;
  sourceName: string;
  pageUrl: string;
  detailUrl?: string;
  registrationUrl?: string;
  registrationRoute: TennisRegistrationRoute;
  snapshotId?: string;
}

export interface TennisSourceSnapshot {
  id: string;
  sourceId: TennisSourceId;
  label: string;
  pageUrl: string;
  collectedAt: string;
  mode: TennisSyncMode;
  success: boolean;
  confidence: number;
  excerpt: string;
  errorMessage?: string;
}

export interface TennisRawTournamentRecord {
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
}

export interface TennisTournament {
  id: string;
  slug: string;
  fingerprint: string;
  name: string;
  organizer?: string;
  venue?: string;
  contactText?: string;
  region: string;
  city?: string;
  startDate: string;
  endDate: string;
  registrationClosesAt?: string;
  feeText?: string;
  feeAmount?: number;
  status: TennisTournamentStatus;
  statusLabel: string;
  rankingType: TennisRankingType;
  levelTags: TennisLevelTag[];
  levelSummary: string;
  formatTags: TennisFormatTag[];
  formatSummary: string;
  genderSummary?: string;
  ageSummary?: string;
  rawEligibility: string;
  normalizedEligibility: string;
  sourceConfidence: number;
  sourceUpdatedAt: string;
  sourceRefs: TennisSourceReference[];
  registrationRoute: TennisRegistrationRoute;
  registrationUrl?: string;
  registrationHint: string;
  freshnessLabel: string;
  notes?: string;
}

export interface TennisReviewItem {
  id: string;
  tournamentId: string;
  tournamentName: string;
  kind: TennisReviewKind;
  reason: string;
  sourceIds: TennisSourceId[];
  createdAt: string;
}

export interface TennisSyncRun {
  id: string;
  requestedSourceId: TennisSourceId | "all";
  startedAt: string;
  completedAt?: string;
  success: boolean;
  syncedCount: number;
  snapshotCount: number;
  mode: TennisSyncMode;
  message: string;
}

export interface TennisBoardMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface TennisDiscoveryBoard {
  generatedAt: string;
  metrics: TennisBoardMetric[];
  featured: TennisTournament[];
  tournaments: TennisTournament[];
  sources: TennisSourceStatus[];
  reviewQueue: TennisReviewItem[];
  recentRuns: TennisSyncRun[];
}

export interface TennisTournamentListResponse {
  ok: true;
  generatedAt: string;
  total: number;
  tournaments: TennisTournament[];
}

export interface TennisSourceStatusResponse {
  ok: true;
  generatedAt: string;
  sources: TennisSourceStatus[];
}

export interface TennisAdminBoardResponse {
  ok: true;
  board: TennisDiscoveryBoard;
}

export interface TennisTournamentDetailResponse {
  ok: true;
  tournament: TennisTournament;
}

export interface TennisSyncResponse {
  ok: true;
  run: TennisSyncRun;
}

export const TENNIS_SOURCE_DEFINITIONS: TennisSourceDefinition[] = [
  {
    id: "kato",
    name: "KATO",
    homepageUrl: "https://kato.kr/openList",
    summary: "전국 동호인 대회 일정과 상세 요강이 공개되는 핵심 소스",
    priority: 1,
    sourceType: "association",
    registrationRoute: "website"
  },
  {
    id: "kta_ranking",
    name: "KTA 생활체육 랭킹",
    homepageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?_code=10078",
    summary: "대한테니스협회 공식 생활체육 랭킹대회 목록",
    priority: 2,
    sourceType: "federation",
    registrationRoute: "app"
  },
  {
    id: "kta_relay",
    name: "KTA 생활체육 신청",
    homepageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?_code=10079",
    summary: "비랭킹/랠리 대회 신청과 규정 상세를 확인하는 공식 페이지",
    priority: 3,
    sourceType: "federation",
    registrationRoute: "website"
  },
  {
    id: "sports_diary",
    name: "스포츠다이어리",
    homepageUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/main/index.asp",
    summary: "KATA/루키 계열 대회 안내와 참가 기준을 제공하는 플랫폼",
    priority: 4,
    sourceType: "platform",
    registrationRoute: "app"
  },
  {
    id: "regional_manual",
    name: "지역/시니어 보강",
    homepageUrl: "https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845",
    summary: "지역 협회와 시니어 단체 공지를 수동 보강하는 큐레이션 소스",
    priority: 5,
    sourceType: "regional",
    registrationRoute: "manual_contact"
  }
];

export const TENNIS_REGION_OPTIONS = [
  "전국",
  "서울",
  "경기",
  "인천",
  "강원",
  "충북",
  "충남",
  "대전",
  "전북",
  "전남",
  "광주",
  "경북",
  "경남",
  "대구",
  "부산",
  "울산",
  "제주"
] as const;
