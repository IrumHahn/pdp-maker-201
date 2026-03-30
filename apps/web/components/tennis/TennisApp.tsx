"use client";

import Link from "next/link";
import { type ChangeEvent, type ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CircleDot, ExternalLink, RefreshCw, Search } from "lucide-react";
import {
  TENNIS_REGION_OPTIONS,
  type TennisAdminBoardResponse,
  type TennisDiscoveryBoard,
  type TennisTournament
} from "@runacademy/shared";
import { Button } from "../ui/button";
import { TENNIS_FALLBACK_BOARD } from "./demo-data";
import styles from "./tennis-app.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_TENNIS_API_BASE_URL ?? "/api";

const REGION_OPTIONS = ["전체", ...TENNIS_REGION_OPTIONS];
const LEVEL_OPTIONS = [
  ["전체", "전체 레벨"],
  ["beginner", "입문"],
  ["novice", "신인"],
  ["intermediate", "중급"],
  ["advanced", "상급"],
  ["senior", "시니어"],
  ["women", "여성부"],
  ["ranked", "랭킹"],
  ["non_ranked", "비랭킹"]
] as const;
const FEE_OPTIONS = [
  ["전체", "참가비 전체"],
  ["under_60000", "6만원 이하"],
  ["between_60000_90000", "6-9만원"],
  ["over_90000", "9만원 이상"]
] as const;
const RANKING_OPTIONS = [
  ["전체", "랭킹 구분 전체"],
  ["ranked", "랭킹"],
  ["non_ranked", "비랭킹"]
] as const;
const FORMAT_OPTIONS = [
  ["전체", "형식 전체"],
  ["doubles", "복식"],
  ["mixed_doubles", "혼합복식"],
  ["women_doubles", "여성복식"],
  ["singles", "단식"]
] as const;

type FilterState = {
  query: string;
  region: string;
  level: string;
  fee: string;
  ranking: string;
  format: string;
};

const initialFilters: FilterState = {
  query: "",
  region: "전체",
  level: "전체",
  fee: "전체",
  ranking: "전체",
  format: "전체"
};

/*
visual thesis: 오프화이트 운영 화면 위에 짙은 코트 그린과 먹색 텍스트만 남긴 차분한 서비스형 앱.
content plan: 앱 헤더 -> 상태 요약 -> 고정 필터 -> 대회 목록 -> 선택 상세 -> 소스 상태.
interaction thesis: 스크롤 시 압축되는 필터바, 목록 선택에 따라 바로 바뀌는 상세 패널, 상태 배지의 선명한 대비.
*/

export function TennisApp() {
  const [board, setBoard] = useState<TennisDiscoveryBoard>(TENNIS_FALLBACK_BOARD);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedId, setSelectedId] = useState(TENNIS_FALLBACK_BOARD.tournaments[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [compressed, setCompressed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<"fallback" | "live">("fallback");

  const deferredQuery = useDeferredValue(filters.query);

  useEffect(() => {
    void loadBoard(false);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setCompressed(window.scrollY > 110);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tournaments = useMemo(() => {
    return board.tournaments.filter((tournament) => {
      if (tournament.status === "ended") {
        return false;
      }

      if (deferredQuery) {
        const haystack = `${tournament.name} ${tournament.venue ?? ""} ${tournament.rawEligibility}`.toLowerCase();
        if (!haystack.includes(deferredQuery.toLowerCase())) {
          return false;
        }
      }

      if (filters.region !== "전체" && tournament.region !== filters.region) {
        return false;
      }

      if (filters.level !== "전체" && !tournament.levelTags.includes(filters.level as never)) {
        return false;
      }

      if (filters.ranking !== "전체" && tournament.rankingType !== filters.ranking) {
        return false;
      }

      if (filters.format !== "전체" && !tournament.formatTags.includes(filters.format as never)) {
        return false;
      }

      if (filters.fee !== "전체") {
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
  }, [board.tournaments, deferredQuery, filters.fee, filters.format, filters.level, filters.ranking, filters.region]);

  const selected = tournaments.find((item) => item.id === selectedId) ?? tournaments[0] ?? board.tournaments[0];
  const reviewItems = board.reviewQueue.slice(0, 4);

  useEffect(() => {
    if (!selected || selected.id === selectedId) {
      return;
    }

    startTransition(() => {
      setSelectedId(selected.id);
    });
  }, [selected, selectedId]);

  async function loadBoard(silent: boolean) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tennis/board`, {
        headers: {
          Accept: "application/json"
        }
      });

      const payload = (await response.json()) as TennisAdminBoardResponse | { ok: false; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "데이터를 불러오지 못했습니다." : payload.message ?? "데이터를 불러오지 못했습니다.");
      }

      setBoard(payload.board);
      setSelectedId((current) => payload.board.tournaments.find((item) => item.id === current)?.id ?? payload.board.tournaments[0]?.id ?? "");
      setDataMode("live");
      setError(null);
    } catch (loadError) {
      setBoard(TENNIS_FALLBACK_BOARD);
      setSelectedId(
        (current) =>
          TENNIS_FALLBACK_BOARD.tournaments.find((item) => item.id === current)?.id ?? TENNIS_FALLBACK_BOARD.tournaments[0]?.id ?? ""
      );
      setDataMode("fallback");
      setError(loadError instanceof Error ? loadError.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        [key]: value
      }));
    });
  }

  function onInputChange(key: keyof FilterState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateFilter(key, event.target.value);
    };
  }

  function applyPreset(next: Partial<FilterState>) {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        ...next
      }));
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.surface}>
        <header className={styles.header}>
          <div>
            <Link className={styles.brand} href="/">
              테니스 대회 정보
            </Link>
            <p className={styles.brandSubline}>전국 아마추어 대회 일정, 참가비, 참가 조건, 신청 경로</p>
          </div>

          <div className={styles.headerActions}>
            <span className={dataMode === "live" ? styles.modeLive : styles.modeFallback}>
              {dataMode === "live" ? "라이브 수집" : "데모 데이터"}
            </span>
            <div className={styles.headerMeta}>
              <span>{loading ? "불러오는 중" : `${tournaments.length}개 표시`}</span>
              <span>{selected?.freshnessLabel ?? "수집 시각 확인 필요"}</span>
              {error ? <span className={styles.headerError}>{error}</span> : null}
            </div>
            <button className={styles.refreshButton} onClick={() => void loadBoard(true)} type="button">
              <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
              새로고침
            </button>
          </div>
        </header>

        <section className={styles.metricStrip}>
          {board.metrics.map((metric) => (
            <article className={styles.metricItem} key={metric.id}>
              <div className={styles.metricLabel}>{metric.label}</div>
              <div className={styles.metricValue}>{metric.value}</div>
              <p className={styles.metricHint}>{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className={`${styles.filterBar} ${compressed ? styles.filterBarCompressed : ""}`}>
          <label className={styles.searchWrap}>
            <Search className={styles.searchIcon} size={18} />
            <input
              className={styles.searchInput}
              onChange={onInputChange("query")}
              placeholder="대회명, 장소, 참가 조건 검색"
              value={filters.query}
            />
          </label>

          <div className={styles.filterGrid}>
            <select className={styles.select} onChange={onInputChange("region")} value={filters.region}>
              {REGION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select className={styles.select} onChange={onInputChange("level")} value={filters.level}>
              {LEVEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select className={styles.select} onChange={onInputChange("fee")} value={filters.fee}>
              {FEE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select className={styles.select} onChange={onInputChange("ranking")} value={filters.ranking}>
              {RANKING_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select className={styles.select} onChange={onInputChange("format")} value={filters.format}>
              {FORMAT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.presetRow}>
            <button className={styles.presetButton} onClick={() => applyPreset({ level: "beginner", ranking: "non_ranked" })} type="button">
              입문 · 비랭킹
            </button>
            <button className={styles.presetButton} onClick={() => applyPreset({ region: "서울", fee: "between_60000_90000" })} type="button">
              서울 · 6-9만원
            </button>
            <button className={styles.presetButton} onClick={() => applyPreset({ region: "경기", level: "women" })} type="button">
              경기 · 여성부
            </button>
            <button className={styles.presetButton} onClick={() => applyPreset({ level: "senior" })} type="button">
              시니어
            </button>
            <button className={styles.presetButton} onClick={() => setFilters(initialFilters)} type="button">
              초기화
            </button>
          </div>
        </section>

        <main className={styles.mainGrid}>
          <section className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>대회 목록</h2>
                <p className={styles.panelNote}>일정, 참가비, 참가 기준, 신청 경로를 한 번에 봅니다.</p>
              </div>
              <div className={styles.panelCount}>{loading ? "불러오는 중" : `${tournaments.length}개`}</div>
            </div>

            {tournaments.length > 0 ? (
              <div className={styles.listRows}>
                {tournaments.map((tournament) => (
                  <button
                    className={`${styles.listRow} ${selected?.id === tournament.id ? styles.listRowActive : ""}`}
                    key={tournament.id}
                    onClick={() => startTransition(() => setSelectedId(tournament.id))}
                    type="button"
                  >
                    <div className={styles.rowHead}>
                      <span className={styles.rowDate}>{formatDateRange(tournament)}</span>
                      <span className={styles.rowState}>{tournament.statusLabel}</span>
                    </div>

                    <div className={styles.rowName}>{tournament.name}</div>
                    <div className={styles.rowMeta}>
                      {tournament.region}
                      {tournament.city ? ` · ${tournament.city}` : ""}
                      {tournament.venue ? ` · ${tournament.venue}` : ""}
                    </div>
                    <div className={styles.rowEligibility}>{tournament.normalizedEligibility}</div>

                    <div className={styles.rowFooter}>
                      <div className={styles.rowTags}>
                        {buildRowTags(tournament).map((tag) => (
                          <span className={styles.tag} key={`${tournament.id}-${tag}`}>
                            <CircleDot size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className={styles.rowPriceBlock}>
                        <span className={styles.rowPrice}>{formatListFee(tournament)}</span>
                        <span className={styles.rowRoute}>{labelRoute(tournament.registrationRoute)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>조건에 맞는 대회가 없습니다.</div>
                <p className={styles.emptyBody}>지역이나 참가 레벨 조건을 조금 넓혀서 다시 확인해 보세요.</p>
              </div>
            )}
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.detailPanel}>
              {selected ? (
                <>
                  <div className={styles.panelLabel}>선택한 대회</div>
                  <h3 className={styles.detailTitle}>{selected.name}</h3>
                  <p className={styles.detailSummary}>{selected.normalizedEligibility}</p>

                  <div className={styles.detailTags}>
                    <StatePill state={selected.sourceRefs[0]?.registrationRoute === "app" ? "warning" : "healthy"}>
                      {selected.statusLabel}
                    </StatePill>
                    <span className={styles.detailTag}>{selected.rankingType === "ranked" ? "랭킹" : "비랭킹"}</span>
                    <span className={styles.detailTag}>{selected.formatSummary}</span>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>일정</span>
                      <span className={styles.detailValue}>{formatDateRange(selected)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>참가비</span>
                      <span className={styles.detailValue}>{formatFee(selected)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>장소</span>
                      <span className={styles.detailValue}>{selected.venue ?? "원문 확인 필요"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>신청 경로</span>
                      <span className={styles.detailValue}>{selected.registrationHint}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>주최</span>
                      <span className={styles.detailValue}>{selected.organizer ?? "원문 확인 필요"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>마지막 수집</span>
                      <span className={styles.detailValue}>{selected.freshnessLabel}</span>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>원문 참가 조건</div>
                    <p className={styles.detailRaw}>{selected.rawEligibility || "원문 참가 조건은 아직 구조화되지 않았습니다."}</p>
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.detailSectionTitle}>원출처</div>
                    <div className={styles.sourceList}>
                      {selected.sourceRefs.map((source) => (
                        <div className={styles.sourceRow} key={`${source.sourceId}-${source.pageUrl}`}>
                          <div>
                            <div className={styles.sourceName}>{source.sourceName}</div>
                            <div className={styles.sourceMeta}>
                              {labelRoute(source.registrationRoute)}
                              {source.detailUrl || source.registrationUrl ? " · 상세 페이지 있음" : ""}
                            </div>
                          </div>
                          <a className={styles.sourceLink} href={source.registrationUrl ?? source.detailUrl ?? source.pageUrl} rel="noreferrer" target="_blank">
                            열기
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button asChild className={styles.primaryAction} size="lg">
                    <a href={selected.registrationUrl ?? selected.sourceRefs[0]?.pageUrl ?? "#"} rel="noreferrer" target="_blank">
                      원출처로 이동
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <div className={styles.panelLabel}>선택한 대회</div>
                  <div className={styles.emptyTitle}>대회를 선택해 주세요.</div>
                  <p className={styles.emptyBody}>목록에서 대회를 누르면 상세 정보와 원출처 링크가 표시됩니다.</p>
                </>
              )}
            </section>

            <section className={styles.infoPanel}>
              <div className={styles.infoHeader}>
                <h3 className={styles.infoTitle}>소스 상태</h3>
                <span className={styles.infoCount}>{board.sources.length}개</span>
              </div>

              <div className={styles.infoList}>
                {board.sources.map((source) => (
                  <article className={styles.infoRow} key={source.id}>
                    <div>
                      <div className={styles.infoRowTitle}>{source.name}</div>
                      <div className={styles.infoRowMeta}>{source.recordCount}개 항목 · {source.lastMode ?? "idle"}</div>
                    </div>
                    <StatePill state={source.state}>{labelSourceState(source.state)}</StatePill>
                  </article>
                ))}
              </div>
            </section>

            {reviewItems.length > 0 ? (
              <section className={styles.infoPanel}>
                <div className={styles.infoHeader}>
                  <h3 className={styles.infoTitle}>검수 필요</h3>
                  <span className={styles.infoCount}>{board.reviewQueue.length}건</span>
                </div>

                <div className={styles.reviewList}>
                  {reviewItems.map((item) => (
                    <article className={styles.reviewRow} key={item.id}>
                      <div className={styles.reviewKind}>{item.kind}</div>
                      <div className={styles.reviewTitle}>{item.tournamentName}</div>
                      <p className={styles.reviewReason}>{item.reason}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  );
}

function buildRowTags(tournament: TennisTournament) {
  const tags = [
    tournament.region,
    tournament.rankingType === "ranked" ? "랭킹" : tournament.rankingType === "non_ranked" ? "비랭킹" : "혼합",
    tournament.formatSummary
  ];

  if (tournament.levelTags.includes("beginner")) {
    tags.push("입문");
  }

  if (tournament.levelTags.includes("senior")) {
    tags.push("시니어");
  }

  if (tournament.levelTags.includes("women")) {
    tags.push("여성부");
  }

  return tags.slice(0, 4);
}

function formatDateRange(tournament: TennisTournament) {
  const start = formatShortDate(tournament.startDate);
  const end = formatShortDate(tournament.endDate);
  return start === end ? start : `${start} - ${end}`;
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function formatFee(tournament: TennisTournament) {
  if (!tournament.feeText) {
    return "참가비 확인중";
  }

  if (!tournament.feeAmount) {
    return tournament.feeText;
  }

  return `${new Intl.NumberFormat("ko-KR").format(tournament.feeAmount)}원`;
}

function formatListFee(tournament: TennisTournament) {
  if (tournament.feeAmount) {
    return `${new Intl.NumberFormat("ko-KR").format(tournament.feeAmount)}원`;
  }

  if (!tournament.feeText) {
    return "참가비 확인중";
  }

  return tournament.feeText.length > 34 ? `${tournament.feeText.slice(0, 34)}…` : tournament.feeText;
}

function labelRoute(route: TennisTournament["registrationRoute"]) {
  switch (route) {
    case "app":
      return "앱 이동";
    case "manual_contact":
      return "문의처 확인";
    default:
      return "웹 신청";
  }
}

function labelSourceState(state: TennisDiscoveryBoard["sources"][number]["state"]) {
  switch (state) {
    case "healthy":
      return "정상";
    case "warning":
      return "검수";
    case "error":
      return "오류";
    default:
      return "대기";
  }
}

function StatePill({ children, state }: { children: ReactNode; state: "healthy" | "warning" | "error" | "idle" }) {
  const className =
    state === "healthy"
      ? styles.stateHealthy
      : state === "warning"
        ? styles.stateWarning
        : state === "error"
          ? styles.stateError
          : styles.stateIdle;

  return <span className={className}>{children}</span>;
}
