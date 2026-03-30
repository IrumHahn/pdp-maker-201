"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Monitor,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users
} from "lucide-react";
import {
  type RiskLevel,
  type SourcingAdminReviewBoard,
  type SourcingAdminReviewItem,
  type SourcingAdminRunSummary,
  type TrendAdminBoard,
  type TrendAgeCode,
  type TrendCategoryNode,
  type TrendCollectionRun,
  type TrendDeviceCode,
  type TrendGenderCode,
  type TrendProfile,
  type TrendRunDetail
} from "@runacademy/shared";
import styles from "./admin.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/v1";

const DEVICE_OPTIONS = [
  ["pc", "PC"],
  ["mo", "모바일"]
] as const;

const GENDER_OPTIONS = [
  ["f", "여성"],
  ["m", "남성"]
] as const;

const AGE_OPTIONS = [
  ["10", "10대"],
  ["20", "20대"],
  ["30", "30대"],
  ["40", "40대"],
  ["50", "50대"],
  ["60", "60대 이상"]
] as const;

const WORKFLOW_ITEMS = [
  {
    icon: Search,
    step: "01",
    title: "프로필 설계",
    description: "카테고리와 필터를 조합해 월간 Top500 수집 기준점을 만듭니다."
  },
  {
    icon: Database,
    step: "02",
    title: "월별 백필",
    description: "2017년 8월부터 2026년 2월까지 마감 월 데이터를 순차 수집합니다."
  },
  {
    icon: FileSpreadsheet,
    step: "03",
    title: "시트 적재",
    description: "raw, meta, matrix 탭으로 동기화해 운영팀이 바로 열람할 수 있게 합니다."
  },
  {
    icon: LayoutDashboard,
    step: "04",
    title: "운영 모니터링",
    description: "실패 재시도, 런 진행률, 기존 소싱 큐를 한 화면에서 관리합니다."
  }
] as const;

type ApiError = {
  ok: false;
  code?: string;
  message?: string;
};

type ReviewBoardResponse = ApiError | { ok: true; board: SourcingAdminReviewBoard };
type TrendBoardResponse = ApiError | { ok: true; board: TrendAdminBoard };
type TrendCategoryResponse = ApiError | { ok: true; nodes: TrendCategoryNode[] };
type TrendProfileResponse = ApiError | { ok: true; profile: TrendProfile };
type TrendRunResponse = ApiError | { ok: true; run: TrendRunDetail };
type TrendSyncResponse = ApiError | { ok: true; sheetUrl: string };

type TrendFormState = {
  name: string;
  spreadsheetId: string;
  category1: string;
  category2: string;
  category3: string;
  devices: TrendDeviceCode[];
  genders: TrendGenderCode[];
  ages: TrendAgeCode[];
};

const initialTrendForm: TrendFormState = {
  name: "",
  spreadsheetId: "",
  category1: "",
  category2: "",
  category3: "",
  devices: [],
  genders: [],
  ages: []
};

function buildLocalTrendSheetUrl(spreadsheetId: string) {
  const trimmed = spreadsheetId.trim();

  if (!trimmed) {
    return "";
  }

  const pathMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (pathMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${pathMatch[1]}`;
  }

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);

  if (queryMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${queryMatch[1]}`;
  }

  return `https://docs.google.com/spreadsheets/d/${trimmed}`;
}

export default function SourcingAdminPage() {
  const [sourcingBoard, setSourcingBoard] = useState<SourcingAdminReviewBoard | null>(null);
  const [trendBoard, setTrendBoard] = useState<TrendAdminBoard | null>(null);
  const [level1Categories, setLevel1Categories] = useState<TrendCategoryNode[]>([]);
  const [level2Categories, setLevel2Categories] = useState<TrendCategoryNode[]>([]);
  const [level3Categories, setLevel3Categories] = useState<TrendCategoryNode[]>([]);
  const [form, setForm] = useState<TrendFormState>(initialTrendForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("월별 Top500 백필과 기존 소싱 운영 큐를 하나의 워크플로우로 묶었습니다.");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const queueSummary = useMemo(() => {
    if (!sourcingBoard) {
      return {
        manual: 0,
        blocked: 0,
        approvals: 0,
        mailbox: 0
      };
    }

    return {
      manual: sourcingBoard.reviewQueue.filter((item) => item.kind === "manual_competition").length,
      blocked: sourcingBoard.reviewQueue.filter((item) => item.kind === "supplier_blocked").length,
      approvals: sourcingBoard.reviewQueue.filter((item) => item.kind === "approval_pending").length,
      mailbox: sourcingBoard.reviewQueue.filter((item) => item.kind === "mailbox_setup").length
    };
  }, [sourcingBoard]);

  const selectedCategory = useMemo(() => {
    return (
      level3Categories.find((item) => String(item.cid) === form.category3) ??
      level2Categories.find((item) => String(item.cid) === form.category2) ??
      level1Categories.find((item) => String(item.cid) === form.category1) ??
      null
    );
  }, [form.category1, form.category2, form.category3, level1Categories, level2Categories, level3Categories]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [reviewResponse, trendResponse] = await Promise.all([
        api<ReviewBoardResponse>("/sourcing/admin/review-board"),
        api<TrendBoardResponse>("/trends/admin/board")
      ]);

      if (cancelled) {
        return;
      }

      if (!reviewResponse.ok) {
        setError(reviewResponse.message ?? "소싱 운영 데이터를 불러오지 못했습니다.");
      } else {
        setSourcingBoard(reviewResponse.board);
      }

      if (!trendResponse.ok) {
        setError(trendResponse.message ?? "트렌드 운영 데이터를 불러오지 못했습니다.");
      } else {
        setTrendBoard(trendResponse.board);
      }

      if (reviewResponse.ok && trendResponse.ok) {
        setError(null);
        setNotice(
          `트렌드 프로필 ${trendResponse.board.profiles.length}개와 운영 큐 ${reviewResponse.board.reviewQueue.length}건을 이 화면에서 함께 관리할 수 있습니다.`
        );
      }

      setLoading(false);
      setRefreshing(false);
    };

    const loadRootCategories = async () => {
      const response = await api<TrendCategoryResponse>("/trends/categories/0");

      if (!cancelled && response.ok) {
        setLevel1Categories(response.nodes);
      }
    };

    void loadPage();
    void loadRootCategories();

    const timer = window.setInterval(() => {
      void loadPage(true);
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const trendRunSummary = useMemo(() => {
    return {
      profiles: trendBoard?.profiles.length ?? 0,
      queued: trendBoard?.runs.filter((run) => run.status === "queued" || run.status === "running").length ?? 0,
      failed: trendBoard?.runs.filter((run) => run.failedTasks > 0).length ?? 0
    };
  }, [trendBoard]);

  const profilePreviewName = form.name.trim() || `${selectedCategory?.fullPath ?? "선택한 카테고리"} 월간 Top500`;
  const selectedDeviceLabel = formatSelection(form.devices, DEVICE_OPTIONS, "전체");
  const selectedGenderLabel = formatSelection(form.genders, GENDER_OPTIONS, "전체");
  const selectedAgeLabel = formatSelection(form.ages, AGE_OPTIONS, "전체");

  const handleCategoryChange = async (level: 1 | 2 | 3, cid: string) => {
    if (level === 1) {
      setForm((current) => ({
        ...current,
        category1: cid,
        category2: "",
        category3: ""
      }));
      setLevel2Categories([]);
      setLevel3Categories([]);

      if (!cid) {
        return;
      }

      const response = await api<TrendCategoryResponse>(`/trends/categories/${cid}`);
      if (response.ok) {
        setLevel2Categories(response.nodes);
      }
      return;
    }

    if (level === 2) {
      setForm((current) => ({
        ...current,
        category2: cid,
        category3: ""
      }));
      setLevel3Categories([]);

      if (!cid) {
        return;
      }

      const response = await api<TrendCategoryResponse>(`/trends/categories/${cid}`);
      if (response.ok) {
        setLevel3Categories(response.nodes);
      }
      return;
    }

    setForm((current) => ({
      ...current,
      category3: cid
    }));
  };

  const handleToggleSelection = <T extends string,>(field: "devices" | "genders" | "ages", value: T) => {
    setForm((current) => {
      const list = current[field] as T[];
      const nextList = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

      return {
        ...current,
        [field]: nextList.sort()
      };
    });
  };

  const handleCreateProfile = async () => {
    if (!selectedCategory) {
      setError("최소 1분류 이상을 선택해 주세요.");
      return;
    }

    if (!form.spreadsheetId.trim()) {
      setError("적재할 구글 스프레드시트 ID를 입력해 주세요.");
      return;
    }

    setPendingAction("create-profile");
    const response = await api<TrendProfileResponse>("/trends/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: profilePreviewName,
        categoryCid: selectedCategory.cid,
        categoryPath: selectedCategory.fullPath,
        categoryDepth: selectedCategory.level,
        timeUnit: "month",
        devices: form.devices,
        genders: form.genders,
        ages: form.ages,
        spreadsheetId: form.spreadsheetId.trim()
      })
    });
    setPendingAction(null);

    if (!response.ok) {
      setError(response.message ?? "트렌드 프로필 생성에 실패했습니다.");
      return;
    }

    setForm(initialTrendForm);
    setLevel2Categories([]);
    setLevel3Categories([]);
    setNotice(`트렌드 프로필 "${response.profile.name}"을 생성했습니다.`);
    setError(null);
    await refreshTrendBoard(setTrendBoard, setError);
  };

  const handleBackfill = async (profileId: string) => {
    setPendingAction(`backfill:${profileId}`);
    const response = await api<TrendRunResponse>(`/trends/profiles/${profileId}/backfill`, {
      method: "POST"
    });
    setPendingAction(null);

    if (!response.ok) {
      setError(response.message ?? "백필 실행에 실패했습니다.");
      return;
    }

    setError(null);
    setNotice(`백필 런을 등록했습니다. ${response.run.totalTasks}개 월 태스크가 준비되었습니다.`);
    await refreshTrendBoard(setTrendBoard, setError);
  };

  const handleRetryFailures = async (runId: string) => {
    setPendingAction(`retry:${runId}`);
    const response = await api<TrendRunResponse>(`/trends/runs/${runId}/retry-failures`, {
      method: "POST"
    });
    setPendingAction(null);

    if (!response.ok) {
      setError(response.message ?? "실패 태스크 재시도에 실패했습니다.");
      return;
    }

    setError(null);
    setNotice(`실패 태스크를 다시 대기열에 올렸습니다. 런 상태: ${trendRunStatusLabel(response.run.status)}.`);
    await refreshTrendBoard(setTrendBoard, setError);
  };

  const handleSyncSheet = async (profileId: string) => {
    setPendingAction(`sync:${profileId}`);
    const response = await api<TrendSyncResponse>(`/trends/profiles/${profileId}/sync-sheet`, {
      method: "POST"
    });
    setPendingAction(null);

    if (!response.ok) {
      setError(response.message ?? "구글시트 동기화에 실패했습니다.");
      return;
    }

    setError(null);
    setNotice("구글시트 동기화를 완료했습니다.");
    await refreshTrendBoard(setTrendBoard, setError);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.heroKicker}>
                <Sparkles size={14} />
                Hanirum Operator Console
              </span>
              <h1 className={styles.heroTitle}>소싱 트렌드 운영 콘솔</h1>
              <p className={styles.heroDescription}>
                상세페이지 마법사의 톤을 이어받아, 월별 Top500 백필과 시트 적재, 실패 재시도, 기존 소싱 운영 큐를 하나의
                컨트롤룸처럼 다룹니다.
              </p>

              <div className={styles.heroMeta}>
                <span className={styles.heroChip}>트렌드 프로필 {trendRunSummary.profiles}개</span>
                <span className={styles.heroChip}>수집 런 대기 {trendRunSummary.queued}건</span>
                <span className={styles.heroChip}>실패 런 {trendRunSummary.failed}건</span>
                <span className={styles.heroChip}>운영 큐 {sourcingBoard?.reviewQueue.length ?? 0}건</span>
              </div>

              <div className={styles.heroActions}>
                <Link href="/sourcing" className={styles.primaryAction}>
                  고객 워크스페이스
                </Link>
                <button className={styles.secondaryAction} type="button" onClick={() => window.location.reload()}>
                  <RefreshCw size={16} />
                  지금 새로고침
                </button>
              </div>
            </div>

            <aside className={styles.heroRail}>
              <article className={styles.heroPanel}>
                <div className={styles.heroPanelHead}>
                  <span className={styles.panelEyebrow}>Live Overview</span>
                  <h2 className={styles.heroPanelTitle}>운영 상태</h2>
                  <p className={styles.heroPanelDescription}>{notice}</p>
                </div>

                <div className={styles.heroStatGrid}>
                  <SummaryMiniCard
                    icon={<Clock3 size={16} />}
                    label="트렌드 갱신"
                    value={formatDateTime(trendBoard?.generatedAt)}
                    hint={refreshing ? "동기화 중" : "최근 자동 새로고침"}
                  />
                  <SummaryMiniCard
                    icon={<BarChart3 size={16} />}
                    label="소싱 갱신"
                    value={formatDateTime(sourcingBoard?.generatedAt)}
                    hint="기존 운영 큐 포함"
                  />
                  <SummaryMiniCard
                    icon={<Database size={16} />}
                    label="프로필/런"
                    value={`${trendRunSummary.profiles}/${trendBoard?.runs.length ?? 0}`}
                    hint="월간 수집 엔진"
                  />
                  <SummaryMiniCard
                    icon={<ShieldAlert size={16} />}
                    label="개입 필요"
                    value={`${queueSummary.manual + queueSummary.blocked + queueSummary.approvals}`}
                    hint="운영자 우선 대응"
                  />
                </div>
              </article>
            </aside>
          </div>
        </section>

        {error ? <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div> : null}
        {loading ? <div className={`${styles.banner} ${styles.bannerLoading}`}>운영 콘솔 데이터를 불러오는 중입니다.</div> : null}

        <section className={styles.workflowGrid}>
          {WORKFLOW_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <article className={styles.workflowCard} key={item.step}>
                <div className={styles.workflowHeader}>
                  <span className={styles.workflowStep}>{item.step}</span>
                  <div className={styles.workflowIcon}>
                    <Icon size={18} />
                  </div>
                </div>
                <h2 className={styles.workflowTitle}>{item.title}</h2>
                <p className={styles.workflowDescription}>{item.description}</p>
              </article>
            );
          })}
        </section>

        <div className={styles.builderGrid}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <span className={styles.surfaceEyebrow}>Trend Builder</span>
                <div className={styles.surfaceTitleRow}>
                  <h2 className={styles.surfaceTitle}>트렌드 프로필 생성</h2>
                  <span className={`${styles.badge} ${styles.badgeProgress}`}>Monthly Only</span>
                </div>
                <p className={styles.surfaceDescription}>
                  1분류부터 3분류까지 선택하고, 기기·성별·연령 필터를 조합해 월간 Top500 백필 프로필을 만듭니다.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>프로필 이름</span>
                <input
                  className={styles.fieldInput}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="예: 패션의류 여성 40대 모바일"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>구글 스프레드시트 ID</span>
                <input
                  className={styles.fieldInput}
                  value={form.spreadsheetId}
                  onChange={(event) => setForm((current) => ({ ...current, spreadsheetId: event.target.value }))}
                  placeholder="시트 ID 또는 전체 Google Sheets URL"
                />
              </label>
            </div>

            <div className={styles.formGridThree}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>1분류</span>
                <select className={styles.fieldInput} value={form.category1} onChange={(event) => void handleCategoryChange(1, event.target.value)}>
                  <option value="">선택</option>
                  {level1Categories.map((category) => (
                    <option key={category.cid} value={category.cid}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>2분류</span>
                <select className={styles.fieldInput} value={form.category2} onChange={(event) => void handleCategoryChange(2, event.target.value)}>
                  <option value="">선택</option>
                  {level2Categories.map((category) => (
                    <option key={category.cid} value={category.cid}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>3분류</span>
                <select className={styles.fieldInput} value={form.category3} onChange={(event) => void handleCategoryChange(3, event.target.value)}>
                  <option value="">선택</option>
                  {level3Categories.map((category) => (
                    <option key={category.cid} value={category.cid}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.filterGrid}>
              <FilterGroup
                label="기기"
                hint="빈 값이면 전체 기기"
                options={DEVICE_OPTIONS}
                values={form.devices}
                onToggle={(value) => handleToggleSelection("devices", value)}
              />
              <FilterGroup
                label="성별"
                hint="비워두면 전체 성별"
                options={GENDER_OPTIONS}
                values={form.genders}
                onToggle={(value) => handleToggleSelection("genders", value)}
              />
              <FilterGroup
                label="연령"
                hint="복수 선택 가능"
                options={AGE_OPTIONS}
                values={form.ages}
                onToggle={(value) => handleToggleSelection("ages", value)}
              />
            </div>

            <div className={styles.actionFooter}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryPill}>기간 2017-08 ~ 2026-02</span>
                <span className={styles.summaryPill}>카테고리 {selectedCategory?.fullPath ?? "선택 필요"}</span>
                <span className={styles.summaryPill}>빈 필터는 전체 조건으로 저장됩니다.</span>
              </div>

              <button
                className={styles.ctaButton}
                type="button"
                onClick={() => void handleCreateProfile()}
                disabled={pendingAction === "create-profile"}
              >
                {pendingAction === "create-profile" ? "프로필 생성 중..." : "트렌드 프로필 만들기"}
              </button>
            </div>
          </section>

          <aside className={styles.sideRail}>
            <section className={styles.surface}>
              <div className={styles.surfaceHeader}>
                <div>
                  <span className={styles.surfaceEyebrow}>Profile Preview</span>
                  <h2 className={styles.surfaceTitle}>이렇게 저장됩니다</h2>
                  <p className={styles.surfaceDescription}>선택값이 프로필, 수집 런, Google Sheets 탭 이름의 기준이 됩니다.</p>
                </div>
              </div>

              <div className={styles.previewGrid}>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>프로필 이름</span>
                  <strong className={styles.previewValue}>{profilePreviewName}</strong>
                </article>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>카테고리</span>
                  <strong className={styles.previewValue}>{selectedCategory?.fullPath ?? "1분류 이상 선택"}</strong>
                </article>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>기기</span>
                  <strong className={styles.previewValue}>{selectedDeviceLabel}</strong>
                </article>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>성별</span>
                  <strong className={styles.previewValue}>{selectedGenderLabel}</strong>
                </article>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>연령</span>
                  <strong className={styles.previewValue}>{selectedAgeLabel}</strong>
                </article>
                <article className={styles.previewCard}>
                  <span className={styles.previewLabel}>수집 단위</span>
                  <strong className={styles.previewValue}>월간 Top500</strong>
                </article>
              </div>
            </section>

            <section className={styles.surface}>
              <div className={styles.surfaceHeader}>
                <div>
                  <span className={styles.surfaceEyebrow}>Operator Notes</span>
                  <h2 className={styles.surfaceTitle}>운영 체크포인트</h2>
                </div>
              </div>

              <div className={styles.miniMetricGrid}>
                <MiniMetricCard icon={<Search size={16} />} label="수동 경쟁 분석" value={`${queueSummary.manual}건`} />
                <MiniMetricCard icon={<ShieldAlert size={16} />} label="리스크 차단" value={`${queueSummary.blocked}건`} />
                <MiniMetricCard icon={<CheckCircle2 size={16} />} label="승인 대기" value={`${queueSummary.approvals}건`} />
                <MiniMetricCard icon={<Users size={16} />} label="메일함 설정" value={`${queueSummary.mailbox}건`} />
              </div>

              <div className={styles.noteList}>
                <div className={styles.noteItem}>
                  <Monitor size={16} />
                  <span>현재 v1은 월간 수집만 노출하고, 주간·일간은 구조만 열어둔 상태입니다.</span>
                </div>
                <div className={styles.noteItem}>
                  <FileSpreadsheet size={16} />
                  <span>서비스 계정 권한이 연결되면 meta, raw, matrix 탭까지 자동 동기화됩니다.</span>
                </div>
                <div className={styles.noteItem}>
                  <Smartphone size={16} />
                  <span>기기, 성별, 연령은 복수 선택 가능하며 비워두면 전체 세그먼트로 저장됩니다.</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className={styles.surface}>
          <div className={styles.surfaceHeader}>
            <div>
              <span className={styles.surfaceEyebrow}>Trend Overview</span>
              <div className={styles.surfaceTitleRow}>
                <h2 className={styles.surfaceTitle}>트렌드 지표</h2>
                <span className={`${styles.badge} ${styles.badgeStable}`}>{trendBoard?.profiles.length ?? 0} profiles</span>
              </div>
              <p className={styles.surfaceDescription}>프로필 수, 누적 스냅샷, 실패 태스크, 대기 중 런 상태를 한 번에 확인합니다.</p>
            </div>
          </div>

          <div className={styles.metricGrid}>
            {(trendBoard?.metrics ?? []).map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        <div className={styles.boardGrid}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <span className={styles.surfaceEyebrow}>Profiles</span>
                <div className={styles.surfaceTitleRow}>
                  <h2 className={styles.surfaceTitle}>트렌드 프로필</h2>
                  <span className={`${styles.badge} ${styles.badgeProgress}`}>{trendBoard?.profiles.length ?? 0} profiles</span>
                </div>
                <p className={styles.surfaceDescription}>프로필별로 백필 실행, 수동 시트 동기화, 시트 링크 열기가 가능합니다.</p>
              </div>
            </div>

            <div className={styles.cardStack}>
              {trendBoard?.profiles.length ? (
                trendBoard.profiles.map((profile) => (
                  <article className={styles.collectionCard} key={profile.id}>
                    <div className={styles.collectionCardHeader}>
                      <div>
                        <p className={styles.collectionMeta}>{profile.categoryPath}</p>
                        <h3 className={styles.collectionTitle}>{profile.name}</h3>
                      </div>
                      <span className={`${styles.badge} ${profileBadgeClass(profile)}`}>{trendProfileStatusLabel(profile.status)}</span>
                    </div>

                    <div className={styles.pillRow}>
                      <span className={styles.pill}>월간</span>
                      <span className={styles.pill}>기기 {formatSelection(profile.devices, DEVICE_OPTIONS, "전체")}</span>
                      <span className={styles.pill}>성별 {formatSelection(profile.genders, GENDER_OPTIONS, "전체")}</span>
                      <span className={styles.pill}>연령 {formatSelection(profile.ages, AGE_OPTIONS, "전체")}</span>
                      <span className={styles.pill}>마지막 수집 {profile.lastCollectedPeriod ?? "-"}</span>
                      <span className={styles.pill}>시트 {syncStatusLabel(profile.syncStatus)}</span>
                    </div>

                    <div className={styles.actionRow}>
                      <button
                        className={styles.ghostButton}
                        type="button"
                        onClick={() => void handleBackfill(profile.id)}
                        disabled={pendingAction === `backfill:${profile.id}`}
                      >
                        {pendingAction === `backfill:${profile.id}` ? "등록 중..." : "백필 실행"}
                      </button>
                      <button
                        className={styles.ghostButton}
                        type="button"
                        onClick={() => void handleSyncSheet(profile.id)}
                        disabled={pendingAction === `sync:${profile.id}`}
                      >
                        {pendingAction === `sync:${profile.id}` ? "동기화 중..." : "시트 동기화"}
                      </button>
                      <a
                        href={buildLocalTrendSheetUrl(profile.spreadsheetId)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.ghostButton}
                      >
                        시트 열기
                        <ArrowUpRight size={15} />
                      </a>
                      <span className={styles.subtleMeta}>업데이트 {formatDateTime(profile.updatedAt)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>아직 생성된 트렌드 프로필이 없습니다.</div>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <span className={styles.surfaceEyebrow}>Runs</span>
                <div className={styles.surfaceTitleRow}>
                  <h2 className={styles.surfaceTitle}>트렌드 수집 런</h2>
                  <span className={`${styles.badge} ${styles.badgeAttention}`}>{trendBoard?.runs.length ?? 0} runs</span>
                </div>
                <p className={styles.surfaceDescription}>월별 진행률과 실패 태스크를 확인하고, 필요한 경우 즉시 재시도합니다.</p>
              </div>
            </div>

            <div className={styles.cardStack}>
              {trendBoard?.runs.length ? (
                trendBoard.runs.map((run) => (
                  <article className={styles.collectionCard} key={run.id}>
                    <div className={styles.collectionCardHeader}>
                      <div>
                        <p className={styles.collectionMeta}>{run.profile.name}</p>
                        <h3 className={styles.collectionTitle}>
                          {run.startPeriod} ~ {run.endPeriod}
                        </h3>
                      </div>
                      <span className={`${styles.badge} ${runBadgeClass(run)}`}>{trendRunStatusLabel(run.status)}</span>
                    </div>

                    <p className={styles.collectionMeta}>
                      완료 {run.completedTasks}/{run.totalTasks} · 실패 {run.failedTasks} · 스냅샷 {run.totalSnapshots.toLocaleString("ko-KR")}건
                    </p>

                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${runProgressPercent(run)}%` }} />
                    </div>

                    {run.snapshotsPreview.length ? (
                      <div className={styles.pillRow}>
                        {run.snapshotsPreview.slice(0, 8).map((snapshot) => (
                          <span className={styles.pill} key={`${snapshot.period}-${snapshot.rank}`}>
                            {snapshot.period} #{snapshot.rank} {snapshot.keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className={styles.actionRow}>
                      {run.failedTasks > 0 ? (
                        <button
                          className={styles.ghostButton}
                          type="button"
                          onClick={() => void handleRetryFailures(run.id)}
                          disabled={pendingAction === `retry:${run.id}`}
                        >
                          {pendingAction === `retry:${run.id}` ? "재등록 중..." : "실패 태스크 재시도"}
                        </button>
                      ) : null}
                      {run.sheetUrl ? (
                        <a href={run.sheetUrl} target="_blank" rel="noreferrer" className={styles.ghostButton}>
                          동기화된 시트
                          <ArrowUpRight size={15} />
                        </a>
                      ) : null}
                      <span className={styles.subtleMeta}>
                        생성 {formatDateTime(run.createdAt)} · 완료 {formatDateTime(run.completedAt)}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>아직 생성된 트렌드 수집 런이 없습니다.</div>
              )}
            </div>
          </section>
        </div>

        <section className={styles.surface}>
          <div className={styles.surfaceHeader}>
            <div>
              <span className={styles.surfaceEyebrow}>Sourcing Ops</span>
              <div className={styles.surfaceTitleRow}>
                <h2 className={styles.surfaceTitle}>기존 소싱 운영 지표</h2>
                <span className={`${styles.badge} ${styles.badgeProgress}`}>{sourcingBoard?.reviewQueue.length ?? 0} open items</span>
              </div>
              <p className={styles.surfaceDescription}>추천 후보의 수동 보강, 승인 대기, 리스크 차단 상태도 함께 관리합니다.</p>
            </div>
          </div>

          <div className={styles.metricGrid}>
            {(sourcingBoard?.metrics ?? []).map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        <div className={styles.boardGrid}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <span className={styles.surfaceEyebrow}>Queue</span>
                <div className={styles.surfaceTitleRow}>
                  <h2 className={styles.surfaceTitle}>운영 큐</h2>
                  <span className={`${styles.badge} ${styles.badgeAttention}`}>{sourcingBoard?.reviewQueue.length ?? 0} items</span>
                </div>
                <p className={styles.surfaceDescription}>지금 운영자가 직접 개입해야 하는 항목만 우선순위 순으로 정리합니다.</p>
              </div>
            </div>

            <div className={styles.cardStack}>
              {sourcingBoard?.reviewQueue.length ? (
                sourcingBoard.reviewQueue.map((item) => (
                  <article className={styles.collectionCard} key={item.id}>
                    <div className={styles.collectionCardHeader}>
                      <div>
                        <p className={styles.collectionMeta}>{reviewKindLabel(item.kind)}</p>
                        <h3 className={styles.collectionTitle}>{item.title}</h3>
                      </div>
                      <span className={`${styles.badge} ${riskBadgeClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
                    </div>
                    <p className={styles.collectionMeta}>{item.subtitle}</p>
                    <p className={styles.surfaceDescription}>{item.detail}</p>
                    <div className={styles.actionRow}>
                      <Link href={workspaceHref(item)} className={styles.ghostButton}>
                        {item.actionLabel}
                      </Link>
                      <span className={styles.subtleMeta}>업데이트 {formatDateTime(item.updatedAt)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>현재 운영자가 즉시 처리할 항목이 없습니다.</div>
              )}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.surfaceHeader}>
              <div>
                <span className={styles.surfaceEyebrow}>Recent Runs</span>
                <div className={styles.surfaceTitleRow}>
                  <h2 className={styles.surfaceTitle}>최근 소싱 런</h2>
                  <span className={`${styles.badge} ${styles.badgeStable}`}>{sourcingBoard?.recentRuns.length ?? 0} runs</span>
                </div>
                <p className={styles.surfaceDescription}>최근 생성되거나 업데이트된 소싱 런을 빠르게 열어볼 수 있습니다.</p>
              </div>
            </div>

            <div className={styles.cardStack}>
              {sourcingBoard?.recentRuns.length ? (
                sourcingBoard.recentRuns.map((run) => {
                  const reviewCandidateId = findFirstReviewCandidateId(run, sourcingBoard.reviewQueue);

                  return (
                    <article className={styles.collectionCard} key={run.id}>
                      <div className={styles.collectionCardHeader}>
                        <div>
                          <p className={styles.collectionMeta}>
                            {modeLabel(run.intakeMode)} · {run.interestSummary}
                          </p>
                          <h3 className={styles.collectionTitle}>
                            {run.topCandidateName ?? "후보 생성 대기"} {run.topCandidateScore ? `· ${run.topCandidateScore}점` : ""}
                          </h3>
                        </div>
                        <span className={`${styles.badge} ${sourcingRunBadgeClass(run)}`}>{runStatusLabel(run.status)}</span>
                      </div>

                      <p className={styles.surfaceDescription}>{run.stageLabel}</p>

                      <div className={styles.pillRow}>
                        <span className={styles.pill}>후보 {run.candidateCount}개</span>
                        <span className={styles.pill}>검토 {run.openReviewItems}건</span>
                        <span className={styles.pill}>메일함 {mailboxLabel(run.mailboxConnectionStatus)}</span>
                      </div>

                      <div className={styles.actionRow}>
                        <Link href={`/sourcing?runId=${encodeURIComponent(run.id)}`} className={styles.ghostButton}>
                          런 열기
                        </Link>
                        {reviewCandidateId ? (
                          <Link
                            href={`/sourcing?runId=${encodeURIComponent(run.id)}&candidateId=${encodeURIComponent(reviewCandidateId)}`}
                            className={styles.ghostButton}
                          >
                            우선 검토 후보
                          </Link>
                        ) : null}
                        <span className={styles.subtleMeta}>업데이트 {formatDateTime(run.updatedAt)}</span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className={styles.emptyState}>아직 생성된 소싱 런이 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FilterGroup<T extends string>({
  label,
  hint,
  options,
  values,
  onToggle
}: {
  label: string;
  hint: string;
  options: readonly (readonly [T, string])[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterGroupHeader}>
        <span className={styles.filterGroupTitle}>{label}</span>
        <span className={styles.filterGroupHint}>{hint}</span>
      </div>

      <div className={styles.filterChipRow}>
        {options.map(([value, copy]) => (
          <button
            key={value}
            className={values.includes(value) ? `${styles.filterChip} ${styles.filterChipActive}` : styles.filterChip}
            type="button"
            onClick={() => onToggle(value)}
          >
            {copy}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: { label: string; value: string; hint: string; tone: string } }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricCardTop}>
        <span className={styles.metricLabel}>{metric.label}</span>
        <span className={`${styles.badge} ${toneToBadgeClass(metric.tone)}`}>{toneLabel(metric.tone)}</span>
      </div>
      <strong className={styles.metricValue}>{metric.value}</strong>
      <p className={styles.metricHint}>{metric.hint}</p>
    </article>
  );
}

function SummaryMiniCard({
  icon,
  label,
  value,
  hint
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className={styles.heroStatCard}>
      <div className={styles.heroStatIcon}>{icon}</div>
      <span className={styles.heroStatLabel}>{label}</span>
      <strong className={styles.heroStatValue}>{value}</strong>
      <span className={styles.heroStatHint}>{hint}</span>
    </article>
  );
}

function MiniMetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={styles.miniMetricCard}>
      <div className={styles.heroStatIcon}>{icon}</div>
      <strong className={styles.miniMetricValue}>{value}</strong>
      <span className={styles.miniMetricLabel}>{label}</span>
    </article>
  );
}

function workspaceHref(item: SourcingAdminReviewItem) {
  const params = new URLSearchParams({
    runId: item.runId
  });

  if (item.candidateId) {
    params.set("candidateId", item.candidateId);
  }

  return `/sourcing?${params.toString()}`;
}

function findFirstReviewCandidateId(run: SourcingAdminRunSummary, queue: SourcingAdminReviewItem[]) {
  return queue.find((item) => item.runId === run.id)?.candidateId;
}

function reviewKindLabel(kind: SourcingAdminReviewItem["kind"]) {
  switch (kind) {
    case "manual_competition":
      return "수동 경쟁 분석";
    case "supplier_blocked":
      return "리스크 차단";
    case "approval_pending":
      return "승인 대기";
    case "mailbox_setup":
      return "메일함 연결";
    default:
      return kind;
  }
}

function priorityLabel(priority: RiskLevel) {
  switch (priority) {
    case "high":
      return "높음";
    case "medium":
      return "중간";
    case "low":
    default:
      return "낮음";
  }
}

function runStatusLabel(status: SourcingAdminRunSummary["status"]) {
  switch (status) {
    case "queued":
      return "준비 중";
    case "running":
      return "진행 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return status;
  }
}

function mailboxLabel(status: SourcingAdminRunSummary["mailboxConnectionStatus"]) {
  switch (status) {
    case "connected":
      return "연결됨";
    case "oauth_pending":
      return "OAuth 대기";
    case "setup_required":
      return "설정 필요";
    case "not_connected":
    default:
      return "미연결";
  }
}

function modeLabel(mode: SourcingAdminRunSummary["intakeMode"]) {
  return mode === "focus_category" ? "카테고리 집중" : "광범위 탐색";
}

function trendRunStatusLabel(status: TrendCollectionRun["status"]) {
  switch (status) {
    case "queued":
      return "대기";
    case "running":
      return "수집 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return status;
  }
}

function trendProfileStatusLabel(status: TrendProfile["status"]) {
  return status === "active" ? "활성" : "일시정지";
}

function syncStatusLabel(status: TrendProfile["syncStatus"]) {
  switch (status) {
    case "syncing":
      return "동기화 중";
    case "synced":
      return "동기화 완료";
    case "failed":
      return "동기화 실패";
    case "idle":
    default:
      return "대기";
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toneToBadgeClass(tone: string) {
  switch (tone) {
    case "high":
      return styles.badgeHigh;
    case "attention":
      return styles.badgeAttention;
    case "progress":
      return styles.badgeProgress;
    default:
      return styles.badgeStable;
  }
}

function riskBadgeClass(priority: RiskLevel) {
  switch (priority) {
    case "high":
      return styles.badgeHigh;
    case "medium":
      return styles.badgeAttention;
    case "low":
    default:
      return styles.badgeStable;
  }
}

function sourcingRunBadgeClass(run: SourcingAdminRunSummary) {
  if (run.status === "failed") {
    return styles.badgeHigh;
  }

  if (run.openReviewItems > 0) {
    return styles.badgeAttention;
  }

  if (run.status === "running" || run.status === "queued") {
    return styles.badgeProgress;
  }

  return styles.badgeStable;
}

function runBadgeClass(run: TrendRunDetail) {
  if (run.status === "failed") {
    return styles.badgeHigh;
  }

  if (run.status === "running" || run.status === "queued") {
    return styles.badgeProgress;
  }

  return styles.badgeStable;
}

function profileBadgeClass(profile: TrendProfile) {
  if (profile.syncStatus === "failed") {
    return styles.badgeHigh;
  }

  if (profile.syncStatus === "syncing") {
    return styles.badgeProgress;
  }

  return styles.badgeStable;
}

function toneLabel(tone: string) {
  switch (tone) {
    case "high":
    case "attention":
      return "Needs Action";
    case "progress":
      return "Moving";
    default:
      return "Stable";
  }
}

function runProgressPercent(run: Pick<TrendRunDetail, "completedTasks" | "totalTasks">) {
  if (!run.totalTasks) {
    return 0;
  }

  return Math.min(100, Math.round((run.completedTasks / run.totalTasks) * 100));
}

function formatSelection<T extends string>(values: readonly T[], options: readonly (readonly [T, string])[], fallback: string) {
  if (!values.length) {
    return fallback;
  }

  const labelMap = new Map(options);
  return values.map((value) => labelMap.get(value) ?? value).join(", ");
}

async function refreshTrendBoard(
  setTrendBoard: (value: TrendAdminBoard | null) => void,
  setError: (value: string | null) => void
) {
  const response = await api<TrendBoardResponse>("/trends/admin/board");

  if (!response.ok) {
    setError(response.message ?? "트렌드 운영 데이터를 새로고침하지 못했습니다.");
    return;
  }

  setTrendBoard(response.board);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  return response.json() as Promise<T>;
}
