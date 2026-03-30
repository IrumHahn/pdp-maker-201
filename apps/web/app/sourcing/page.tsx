"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import type {
  CompetitionReport,
  DiscoveryRunDetail,
  MailboxConnection,
  NegotiationThread,
  PreferenceLevel,
  ProductCandidate,
  ProductCandidateSummary,
  RiskLevel,
  SourcingIntake,
  SourcingIntakeInput
} from "@runacademy/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/v1";

type ApiError = {
  ok: false;
  code?: string;
  message?: string;
};

type IntakeResponse = ApiError | { ok: true; intake: SourcingIntake };
type RunResponse = ApiError | { ok: true; run: DiscoveryRunDetail };
type CandidateResponse = ApiError | { ok: true; candidate: ProductCandidate };
type CompetitionResponse = ApiError | { ok: true; report: CompetitionReport; candidate: ProductCandidate };
type SupplierResponse = ApiError | { ok: true; suppliers: ProductCandidate["supplierLeads"]; candidate: ProductCandidate };
type MailboxResponse =
  | ApiError
  | {
      ok: true;
      connection: MailboxConnection;
      setupRequired?: boolean;
      instructions?: string[];
      mode?: string;
    };
type DraftInquiryResponse =
  | ApiError
  | {
      ok: true;
      thread: NegotiationThread;
      draft: NegotiationThread["latestDraft"];
      approvalRequest?: NegotiationThread["pendingApproval"];
      candidate: ProductCandidate;
      supplierLead: ProductCandidate["supplierLeads"][number];
      mailboxConnectionStatus: MailboxConnection["status"];
    };
type ApproveSendResponse =
  | ApiError
  | {
      ok: true;
      thread: NegotiationThread;
      candidate: ProductCandidate;
      deliveryMode: "mock" | "gmail_api";
      sentMessage: NegotiationThread["messages"][number];
    };
type DraftReplyResponse =
  | ApiError
  | {
      ok: true;
      thread: NegotiationThread;
      candidate: ProductCandidate;
      supplierLead: ProductCandidate["supplierLeads"][number];
      latestSupplierReply: NegotiationThread["messages"][number];
    };

const initialForm: SourcingIntakeInput = {
  mode: "explore_anything",
  interests: [],
  excludedCategories: [],
  targetPriceBand: "1만~5만원",
  targetMarginPercent: 35,
  shippingSensitivity: "medium",
  regulationSensitivity: "high",
  sourcingCountries: ["CN", "KR"],
  notes: ""
};

const riskTone: Record<RiskLevel, string> = {
  low: "risk-low",
  medium: "risk-medium",
  high: "risk-high"
};

export default function SourcingPage() {
  return (
    <Suspense fallback={<div className="sourcing-page sourcing-page-v2"><div className="notice-banner">소싱 워크스페이스를 준비하는 중입니다.</div></div>}>
      <SourcingPageClient />
    </Suspense>
  );
}

function SourcingPageClient() {
  const searchParams = useSearchParams();
  const requestedRunId = searchParams.get("runId");
  const requestedCandidateId = searchParams.get("candidateId");
  const [form, setForm] = useState<SourcingIntakeInput>(initialForm);
  const [intake, setIntake] = useState<SourcingIntake | null>(null);
  const [run, setRun] = useState<DiscoveryRunDetail | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<ProductCandidate | null>(null);
  const [mailbox, setMailbox] = useState<MailboxConnection | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [notice, setNotice] = useState("AI가 상품 추천, 경쟁 분석, 공급처 후보, 협상 초안을 단계별로 정리합니다.");
  const [error, setError] = useState<string | null>(null);
  const [localMarketUrl, setLocalMarketUrl] = useState("");
  const [pageSnapshotText, setPageSnapshotText] = useState("");
  const [reviewSnapshotText, setReviewSnapshotText] = useState("");
  const [mockMailboxEmail, setMockMailboxEmail] = useState("buyer-demo@haniroom.ai");
  const [supplierReplyText, setSupplierReplyText] = useState("");

  const activeThread = useMemo(
    () => candidate?.negotiationThreads.find((thread) => thread.id === activeThreadId) ?? candidate?.negotiationThreads[0] ?? null,
    [candidate, activeThreadId]
  );

  useEffect(() => {
    void loadMailbox();
  }, []);

  useEffect(() => {
    if (!requestedRunId) {
      return;
    }

    if (run?.id === requestedRunId && (!requestedCandidateId || selectedCandidateId === requestedCandidateId)) {
      return;
    }

    let cancelled = false;

    const hydrateRunFromQuery = async () => {
      setLoading(true);
      setError(null);

      const response = await api<RunResponse>(`/sourcing/runs/${requestedRunId}`);

      if (cancelled) {
        return;
      }

      setLoading(false);

      if (!response.ok) {
        setError(response.message ?? "요청한 소싱 런을 불러오지 못했습니다.");
        return;
      }

      setRun(response.run);
      setSelectedCandidateId(requestedCandidateId ?? response.run.candidates[0]?.id ?? null);
      setActiveThreadId(null);
      setNotice("운영 콘솔 링크로 선택한 소싱 런을 불러왔습니다.");
    };

    void hydrateRunFromQuery();

    return () => {
      cancelled = true;
    };
  }, [requestedRunId, requestedCandidateId, run?.id, selectedCandidateId]);

  useEffect(() => {
    if (!run || (run.status !== "queued" && run.status !== "running")) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await api<RunResponse>(`/sourcing/runs/${run.id}`);

      if (!response.ok) {
        setError(response.message ?? "소싱 런 상태를 불러오지 못했습니다.");
        return;
      }

      setRun(response.run);

      if (!selectedCandidateId && response.run.candidates.length > 0) {
        setSelectedCandidateId(response.run.candidates[0].id);
      }
    }, 900);

    return () => {
      window.clearInterval(timer);
    };
  }, [run, selectedCandidateId]);

  useEffect(() => {
    if (!selectedCandidateId) {
      return;
    }

    let cancelled = false;

    const loadCandidate = async () => {
      setCandidateLoading(true);
      const response = await api<CandidateResponse>(`/sourcing/candidates/${selectedCandidateId}`);

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setError(response.message ?? "후보 상세를 불러오지 못했습니다.");
      } else {
        setCandidate(response.candidate);
        if (!activeThreadId && response.candidate.negotiationThreads.length > 0) {
          setActiveThreadId(response.candidate.negotiationThreads[0].id);
        }
      }

      setCandidateLoading(false);
    };

    void loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [selectedCandidateId, activeThreadId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (run?.id) {
      url.searchParams.set("runId", run.id);
    } else {
      url.searchParams.delete("runId");
    }

    if (selectedCandidateId) {
      url.searchParams.set("candidateId", selectedCandidateId);
    } else {
      url.searchParams.delete("candidateId");
    }

    window.history.replaceState({}, "", url);
  }, [run?.id, selectedCandidateId]);

  async function loadMailbox() {
    setMailboxLoading(true);
    const response = await api<MailboxResponse>("/sourcing/mailboxes/google");

    if (response.ok) {
      setMailbox(response.connection);
    }

    setMailboxLoading(false);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const intakeResponse = await api<IntakeResponse>("/sourcing/intakes", {
      method: "POST",
      body: JSON.stringify(form)
    });

    if (!intakeResponse.ok) {
      setLoading(false);
      setError(intakeResponse.message ?? "인테이크 생성에 실패했습니다.");
      return;
    }

    setIntake(intakeResponse.intake);

    const runResponse = await api<RunResponse>("/sourcing/runs", {
      method: "POST",
      body: JSON.stringify({ intakeId: intakeResponse.intake.id })
    });

    setLoading(false);

    if (!runResponse.ok) {
      setError(runResponse.message ?? "소싱 런 시작에 실패했습니다.");
      return;
    }

    setRun(runResponse.run);
    setCandidate(null);
    setSelectedCandidateId(null);
    setActiveThreadId(null);
    setNotice("총괄 에이전트가 소싱 런을 시작했습니다.");
  };

  const handleRefreshCompetition = async () => {
    if (!candidate) {
      return;
    }

    setCandidateLoading(true);
    setError(null);

    const response = await api<CompetitionResponse>(`/sourcing/candidates/${candidate.id}/competition-report/refresh`, {
      method: "POST",
      body: JSON.stringify({
        url: localMarketUrl,
        pageSnapshotText,
        reviewSnapshotText
      })
    });

    setCandidateLoading(false);

    if (!response.ok) {
      setError(response.message ?? "경쟁 분석 갱신에 실패했습니다.");
      return;
    }

    setCandidate(response.candidate);
    setNotice(`${response.report.source === "naver_api" ? "NAVER API" : "추정/스냅샷"} 기준으로 경쟁 리포트를 갱신했습니다.`);
  };

  const handleRefreshSuppliers = async () => {
    if (!candidate) {
      return;
    }

    setCandidateLoading(true);
    setError(null);

    const response = await api<SupplierResponse>(`/sourcing/candidates/${candidate.id}/suppliers/refresh`, {
      method: "POST"
    });

    setCandidateLoading(false);

    if (!response.ok) {
      setError(response.message ?? "공급처 후보를 생성하지 못했습니다.");
      return;
    }

    setCandidate(response.candidate);
    setNotice(`${response.suppliers.length}개 공급처 후보를 준비했습니다.`);
  };

  const handleStartGoogleConnect = async () => {
    setMailboxLoading(true);
    const response = await api<MailboxResponse>("/sourcing/mailboxes/google/connect/start", {
      method: "POST",
      body: JSON.stringify({
        redirectUri: typeof window === "undefined" ? undefined : `${window.location.origin}/sourcing`
      })
    });
    setMailboxLoading(false);

    if (!response.ok) {
      setError(response.message ?? "Google 연결 시작에 실패했습니다.");
      return;
    }

    setMailbox(response.connection);

    if (response.connection.authUrl) {
      window.open(response.connection.authUrl, "_blank", "noopener,noreferrer");
      setNotice("Google OAuth 창을 열었습니다. 지금은 데모 연결도 사용할 수 있습니다.");
      return;
    }

    setNotice(response.instructions?.join(" ") ?? "현재는 데모 메일함 연결 모드입니다.");
  };

  const handleCompleteMockConnect = async () => {
    setMailboxLoading(true);
    setError(null);

    const response = await api<MailboxResponse>("/sourcing/mailboxes/google/connect/complete", {
      method: "POST",
      body: JSON.stringify({
        email: mockMailboxEmail,
        displayName: "Han Iroom Buyer"
      })
    });

    setMailboxLoading(false);

    if (!response.ok) {
      setError(response.message ?? "메일함 연결에 실패했습니다.");
      return;
    }

    setMailbox(response.connection);
    setNotice(`${response.connection.email ?? "메일함"} 이 연결되었습니다.`);
  };

  const handleDraftInquiry = async (supplierLeadId: string) => {
    setCandidateLoading(true);
    setError(null);

    const response = await api<DraftInquiryResponse>(`/sourcing/negotiations/${supplierLeadId}/draft-inquiry`, {
      method: "POST",
      body: JSON.stringify({})
    });

    setCandidateLoading(false);

    if (!response.ok) {
      setError(response.message ?? "문의 초안 생성에 실패했습니다.");
      return;
    }

    setCandidate(response.candidate);
    setActiveThreadId(response.thread.id);
    setNotice(
      response.mailboxConnectionStatus === "connected"
        ? "문의 초안이 생성되어 승인 대기 상태입니다."
        : "문의 초안이 생성되었습니다. 메일함을 연결하면 승인 발송할 수 있습니다."
    );
  };

  const handleApproveSend = async (threadId: string) => {
    setCandidateLoading(true);
    setError(null);

    const response = await api<ApproveSendResponse>(`/sourcing/negotiations/${threadId}/approve-send`, {
      method: "POST"
    });

    setCandidateLoading(false);

    if (!response.ok) {
      setError(response.message ?? "메일 발송 승인에 실패했습니다.");
      return;
    }

    setCandidate(response.candidate);
    setActiveThreadId(response.thread.id);
    setNotice(response.deliveryMode === "gmail_api" ? "Gmail API로 메일을 발송했습니다." : "데모 전송으로 메일 발송 처리했습니다.");
  };

  const handleDraftReply = async (threadId: string) => {
    setCandidateLoading(true);
    setError(null);

    const response = await api<DraftReplyResponse>(`/sourcing/negotiations/${threadId}/draft-reply`, {
      method: "POST",
      body: JSON.stringify({
        supplierReplyText
      })
    });

    setCandidateLoading(false);

    if (!response.ok) {
      setError(response.message ?? "후속 답장 초안 생성에 실패했습니다.");
      return;
    }

    setCandidate(response.candidate);
    setActiveThreadId(response.thread.id);
    setNotice("공급처 답장을 반영한 후속 협상 초안을 만들었습니다.");
  };

  return (
    <div className="sourcing-page sourcing-page-v2">
      <section className="sourcing-header sourcing-hero">
        <div className="sourcing-header-copy">
          <span className="sourcing-badge">HAN IROOM SOURCING WIZARD 1.0</span>
          <h1>한이룸의 소싱 마법사</h1>
          <p>전세계 인기 제품과 숨은 기회 제품을 찾고, 한국 경쟁 상황과 공급처, 협상 초안까지 한 흐름으로 연결합니다.</p>
          <div className="sourcing-header-actions">
            <button className="primary-button" onClick={() => window.scrollTo({ top: 420, behavior: "smooth" })}>
              소싱 런 시작
            </button>
            <Link href="/sourcing/admin" className="secondary-button sourcing-secondary-button">
              운영 콘솔
            </Link>
            <Link href="/" className="secondary-button sourcing-secondary-button">
              홈
            </Link>
          </div>
        </div>

        <div className="sourcing-summary-grid sourcing-summary-grid-v2">
          <SummaryCard label="탐색 모드" value={modeLabel(form.mode)} />
          <SummaryCard label="런 상태" value={runStatusLabel(run?.status)} />
          <SummaryCard label="메일함" value={mailboxStatusLabel(mailbox?.status)} />
          <SummaryCard label="후보 수" value={`${run?.candidateCount ?? 0}개`} />
        </div>
      </section>

      <section className="sourcing-panel sourcing-stage-panel">
        <div className="sourcing-panel-head">
          <div>
            <h2>오케스트레이션 단계</h2>
            <p>총괄 에이전트가 각 서브에이전트 작업을 추적합니다.</p>
          </div>
          <span className={`run-status ${run?.status ?? "idle"}`}>{runStatusLabel(run?.status)}</span>
        </div>

        <div className="workflow-strip workflow-strip-v2">
          {(run?.stages ?? []).map((stage) => (
            <span key={stage.stage} className={`workflow-chip ${stage.status}`}>
              {stage.label}
            </span>
          ))}
        </div>

        <div className="notice-stack">
          <div className="notice-banner">{notice}</div>
          {error ? <div className="error-banner">{error}</div> : null}
        </div>

        {run?.tasks.length ? (
          <div className="task-timeline">
            {run.tasks.map((task) => (
              <article key={task.id} className={`task-card task-${task.status}`}>
                <div className="task-head">
                  <strong>{task.title}</strong>
                  <span>{task.agent}</span>
                </div>
                <p>{task.summary}</p>
                <small>{task.outputSummary ?? task.inputSummary ?? stageLabel(task.stage)}</small>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="sourcing-main-grid">
        <section className="sourcing-panel">
          <div className="sourcing-panel-head">
            <div>
              <h2>1. 온보딩</h2>
              <p>무엇을 팔지 몰라도 시작할 수 있도록 탐색 조건만 입력합니다.</p>
            </div>
            <span className="soft-pill">{modeLabel(form.mode)}</span>
          </div>

          <form className="sourcing-form" onSubmit={handleSubmit}>
            <div className="mode-switch">
              <button
                type="button"
                className={`mode-switch-button ${form.mode === "explore_anything" ? "active" : ""}`}
                onClick={() => setForm((current) => ({ ...current, mode: "explore_anything" }))}
              >
                무엇을 팔지 모름
              </button>
              <button
                type="button"
                className={`mode-switch-button ${form.mode === "focus_category" ? "active" : ""}`}
                onClick={() => setForm((current) => ({ ...current, mode: "focus_category" }))}
              >
                특정 분야 집중
              </button>
            </div>

            <div className="form-grid">
              <label>
                관심 키워드
                <input
                  value={form.interests.join(", ")}
                  onChange={(event) => setForm((current) => ({ ...current, interests: splitTags(event.target.value) }))}
                  placeholder="예: beauty, pet, kitchen"
                />
              </label>
              <label>
                제외 키워드
                <input
                  value={form.excludedCategories.join(", ")}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, excludedCategories: splitTags(event.target.value) }))
                  }
                  placeholder="예: bulky, certification"
                />
              </label>
              <label>
                목표 가격대
                <input
                  value={form.targetPriceBand}
                  onChange={(event) => setForm((current) => ({ ...current, targetPriceBand: event.target.value }))}
                />
              </label>
              <label>
                목표 마진 %
                <input
                  type="number"
                  min={10}
                  max={80}
                  value={form.targetMarginPercent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, targetMarginPercent: Number(event.target.value) || 35 }))
                  }
                />
              </label>
              <label>
                배송 민감도
                <select
                  value={form.shippingSensitivity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shippingSensitivity: event.target.value as PreferenceLevel
                    }))
                  }
                >
                  <option value="low">낮음</option>
                  <option value="medium">중간</option>
                  <option value="high">높음</option>
                </select>
              </label>
              <label>
                규제 민감도
                <select
                  value={form.regulationSensitivity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      regulationSensitivity: event.target.value as PreferenceLevel
                    }))
                  }
                >
                  <option value="low">낮음</option>
                  <option value="medium">중간</option>
                  <option value="high">높음</option>
                </select>
              </label>
              <label className="wide">
                선호 소싱 국가
                <input
                  value={form.sourcingCountries.join(", ")}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sourcingCountries: splitTags(event.target.value) }))
                  }
                  placeholder="예: CN, KR, VN"
                />
              </label>
              <label className="wide">
                메모
                <textarea
                  rows={3}
                  value={form.notes ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="예: KC/지재권 리스크가 큰 상품은 제외"
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "런 준비 중..." : "후보 찾기"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setNotice("기본 입력값으로 되돌렸습니다.");
                }}
              >
                초기화
              </button>
            </div>
          </form>

          {intake ? (
            <div className="progress-summary onboarding-summary">
              <div className="progress-summary-item">
                <span>생성된 인테이크</span>
                <strong>{intake.id.slice(0, 8)}</strong>
              </div>
              <div className="progress-summary-item">
                <span>노트</span>
                <strong>{intake.notes || "없음"}</strong>
              </div>
            </div>
          ) : null}
        </section>

        <section className="sourcing-panel">
          <div className="sourcing-panel-head">
            <div>
              <h2>2. 후보 리스트</h2>
              <p>인기 제품, 숨은 기회 제품, 관심 분야 적합 제품을 점수와 함께 확인합니다.</p>
            </div>
            <span className="soft-pill">{run?.candidates.length ?? 0} candidates</span>
          </div>

          <div className="candidate-list">
            {run?.candidates.length ? (
              run.candidates.map((item) => (
                <button
                  key={item.id}
                  className={`candidate-item candidate-item-v2 ${selectedCandidateId === item.id ? "selected" : ""}`}
                  onClick={() => setSelectedCandidateId(item.id)}
                  type="button"
                >
                  <div className="candidate-item-head">
                    <div>
                      <strong>{item.localizedName}</strong>
                      <span>{item.category}</span>
                    </div>
                    <div className="score-badge">{item.scores.overallScore}</div>
                  </div>
                  <div className="candidate-meta">
                    <span className="kpi-pill kpi-opportunity">{item.opportunityTitle}</span>
                    <span className="kpi-pill">{item.globalPopularityLabel}</span>
                    <span className="kpi-pill">{item.koreaCompetitionLabel}</span>
                    <span className={`risk-pill ${riskTone[item.riskLevel]}`}>{riskLabel(item.riskLevel)}</span>
                  </div>
                  <p>{item.whyHot}</p>
                  <div className="candidate-footer-meta">
                    <span>예상 마진 {item.estimatedMarginPercent}%</span>
                    <span>{item.hiddenOpportunityLabel}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">소싱 런을 시작하면 후보 리스트가 여기에 나타납니다.</div>
            )}
          </div>
        </section>
      </div>

      <section className="sourcing-panel sourcing-detail-panel">
        <div className="sourcing-panel-head">
          <div>
            <h2>상세 워크스페이스</h2>
            <p>선택한 후보의 경쟁 분석, 공급처 탐색, 협상함을 이어서 작업합니다.</p>
          </div>
          {candidateLoading ? <span className="soft-pill">업데이트 중</span> : null}
        </div>

        {!candidate ? (
          <div className="empty-detail">후보를 선택하면 3~5단 워크스페이스가 열립니다.</div>
        ) : (
          <div className="candidate-detail">
            <div className="detail-header detail-header-v2">
              <div>
                <h3>{candidate.localizedName}</h3>
                <p className="detail-subtitle">
                  {candidate.canonicalName} · {candidate.category}
                </p>
                <p className="detail-description">{candidate.whyHot}</p>
                <div className="candidate-meta">
                  <span className="kpi-pill kpi-opportunity">{candidate.opportunityTitle}</span>
                  <span className="kpi-pill">{candidate.globalPopularityLabel}</span>
                  <span className="kpi-pill">{candidate.hiddenOpportunityLabel}</span>
                  <span className={`risk-pill ${riskTone[candidate.riskLevel]}`}>{riskLabel(candidate.riskLevel)}</span>
                </div>
              </div>
              <div className="detail-score-box">
                <span>종합 점수</span>
                <strong>{candidate.scores.overallScore}</strong>
                <small>예상 마진 {candidate.estimatedMarginPercent}%</small>
              </div>
            </div>

            <div className="score-grid">
              <ScoreCard label="Demand" value={candidate.scores.demandScore} />
              <ScoreCard label="Trend" value={candidate.scores.trendScore} />
              <ScoreCard label="Korea Fit" value={candidate.scores.koreaFitScore} />
              <ScoreCard label="Sourcing Ease" value={candidate.scores.sourcingEaseScore} />
              <ScoreCard label="Risk Adjusted" value={candidate.scores.riskAdjustedScore} />
            </div>

            <div className="detail-grid">
              <section className="detail-section">
                <h4>상품 평가 요약</h4>
                <ul>
                  <li>누가 살지: {candidate.targetCustomer}</li>
                  <li>누가 팔면 유리한지: {candidate.whoShouldSell}</li>
                  <li>한국 판매 각도: {candidate.koreanAngle}</li>
                  <li>리스크: {candidate.riskLabels.length ? candidate.riskLabels.join(", ") : "낮음"}</li>
                </ul>
                <div className="reason-list">
                  {candidate.evaluationReasons.map((reason) => (
                    <span key={reason} className="reason-pill">
                      {reason}
                    </span>
                  ))}
                </div>
                <p className="section-note">{candidate.notes}</p>
              </section>

              <section className="detail-section">
                <h4>근거 데이터</h4>
                <div className="evidence-list">
                  {candidate.evidence.map((evidence) => (
                    <article key={evidence.id} className="evidence-card">
                      <div className="evidence-head">
                        <strong>{evidence.sourceName}</strong>
                        <span>{Math.round(evidence.confidence * 100)}%</span>
                      </div>
                      <p>{evidence.summary}</p>
                      <small>
                        {evidence.metricLabel}: {evidence.metricValue}
                      </small>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className="detail-grid detail-grid-stages">
              <section className="detail-section stage-card">
                <div className="inline-head">
                  <div>
                    <h4>3. 한국 경쟁 분석</h4>
                    <p className="section-caption">NAVER API가 있으면 실데이터로, 없으면 추정/스냅샷 기반으로 갱신합니다.</p>
                  </div>
                  <button className="inline-button" onClick={handleRefreshCompetition} type="button">
                    경쟁 리포트 갱신
                  </button>
                </div>

                <div className="compact-form">
                  <input
                    value={localMarketUrl}
                    onChange={(event) => setLocalMarketUrl(event.target.value)}
                    placeholder="선택: 참고할 국내 마켓 URL"
                  />
                  <textarea
                    rows={3}
                    value={pageSnapshotText}
                    onChange={(event) => setPageSnapshotText(event.target.value)}
                    placeholder="선택: 상세페이지 스냅샷 텍스트"
                  />
                  <textarea
                    rows={2}
                    value={reviewSnapshotText}
                    onChange={(event) => setReviewSnapshotText(event.target.value)}
                    placeholder="선택: 후기/리뷰 스냅샷 텍스트"
                  />
                </div>

                {candidate.competitionReport ? (
                  <article className="snapshot-card competition-card">
                    <strong>{candidate.competitionReport.source === "naver_api" ? "NAVER API 리포트" : "추정/스냅샷 리포트"}</strong>
                    <p>
                      {candidate.competitionReport.priceMinKrw.toLocaleString()}원 ~{" "}
                      {candidate.competitionReport.priceMaxKrw.toLocaleString()}원 · 중앙값{" "}
                      {candidate.competitionReport.priceMedianKrw.toLocaleString()}원
                    </p>
                    <ul>
                      <li>판매자 밀도: {candidate.competitionReport.sellerDensity}</li>
                      <li>리뷰 밀도: {candidate.competitionReport.reviewDensity}</li>
                      <li>검색 관심도: {candidate.competitionReport.searchInterest}</li>
                      <li>{candidate.competitionReport.competitionSummary}</li>
                      <li>{candidate.competitionReport.insightSummary}</li>
                    </ul>
                    <div className="reason-list">
                      {candidate.competitionReport.differentiationIdeas.map((idea) => (
                        <span key={idea} className="reason-pill">
                          {idea}
                        </span>
                      ))}
                    </div>
                  </article>
                ) : (
                  <div className="empty-inline">경쟁 리포트가 아직 없습니다.</div>
                )}
              </section>

              <section className="detail-section stage-card">
                <div className="inline-head">
                  <div>
                    <h4>4. 공급처 조사</h4>
                    <p className="section-caption">Alibaba 우선으로 MOQ, 단가, 샘플 가능 여부를 비교합니다.</p>
                  </div>
                  <button className="inline-button" onClick={handleRefreshSuppliers} type="button">
                    공급처 후보 생성
                  </button>
                </div>

                <div className="search-links">
                  {candidate.supplierSearchLinks.map((link) => (
                    <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>

                {candidate.supplierLeads.length ? (
                  <div className="supplier-list">
                    {candidate.supplierLeads.map((supplier) => (
                      <article key={supplier.id} className="supplier-card">
                        <div className="supplier-head">
                          <strong>{supplier.supplierName}</strong>
                          <span>{Math.round(supplier.confidence * 100)}%</span>
                        </div>
                        <p>
                          {supplier.sourceSite} · {supplier.supplierCountry} · MOQ {supplier.moq}
                        </p>
                        <p>
                          {supplier.unitPriceRange} · {supplier.leadTime}
                        </p>
                        <small>{supplier.capabilitySummary}</small>
                        <div className="candidate-meta">
                          <span className="kpi-pill">{supplier.sampleAvailable ? "샘플 가능" : "샘플 확인 필요"}</span>
                          <span className="kpi-pill">{supplier.oemAvailable ? "OEM 가능" : "OEM 확인 필요"}</span>
                        </div>
                        <div className="supplier-actions">
                          <a href={supplier.searchUrl} target="_blank" rel="noreferrer">
                            검색 열기
                          </a>
                          <button onClick={() => handleDraftInquiry(supplier.id)} type="button">
                            문의 초안 만들기
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-inline">공급처 후보를 생성하면 이곳에 표시됩니다.</div>
                )}
              </section>
            </div>

            <section className="detail-section stage-card negotiation-stage">
              <div className="inline-head">
                <div>
                  <h4>5. 협상함</h4>
                  <p className="section-caption">Gmail 연결 후 승인 기반으로 발송하고, 공급처 답장을 붙여넣어 후속 초안을 만듭니다.</p>
                </div>
                {mailboxLoading ? <span className="soft-pill">메일함 확인 중</span> : null}
              </div>

              <div className="mailbox-card">
                <div>
                  <strong>{mailbox?.email ?? "Google 메일함 미연결"}</strong>
                  <p>{mailboxStatusCopy(mailbox?.status)}</p>
                </div>
                <div className="mailbox-actions">
                  <button className="inline-button" type="button" onClick={handleStartGoogleConnect}>
                    Google 연결 시작
                  </button>
                  <div className="mailbox-demo-connect">
                    <input
                      value={mockMailboxEmail}
                      onChange={(event) => setMockMailboxEmail(event.target.value)}
                      placeholder="데모 메일 주소"
                    />
                    <button className="ghost-button" type="button" onClick={handleCompleteMockConnect}>
                      데모 연결
                    </button>
                  </div>
                </div>
              </div>

              <div className="negotiation-grid">
                <div className="thread-column">
                  {candidate.negotiationThreads.length ? (
                    candidate.negotiationThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        className={`thread-card ${activeThread?.id === thread.id ? "selected" : ""}`}
                        onClick={() => setActiveThreadId(thread.id)}
                      >
                        <strong>{supplierName(candidate, thread)}</strong>
                        <span>{thread.status}</span>
                        <p>{thread.summary}</p>
                      </button>
                    ))
                  ) : (
                    <div className="empty-inline">문의 초안을 만들면 협상 스레드가 이곳에 표시됩니다.</div>
                  )}
                </div>

                <div className="thread-detail">
                  {activeThread ? (
                    <div className="thread-detail-body">
                      <div className="thread-summary">
                        <strong>{supplierName(candidate, activeThread)}</strong>
                        <span>{activeThread.nextRecommendedAction}</span>
                      </div>

                      <div className="reason-list">
                        <span className="reason-pill">목표단가 USD {activeThread.guardrails.targetUnitPriceUsd.toFixed(2)}</span>
                        <span className="reason-pill">최대 MOQ {activeThread.guardrails.maxMoq}</span>
                        <span className="reason-pill">{activeThread.guardrails.desiredIncoterm}</span>
                      </div>

                      {activeThread.latestDraft ? (
                        <article className="draft-card">
                          <div className="inline-head">
                            <strong>{activeThread.latestDraft.subject}</strong>
                            <span>{activeThread.latestDraft.status}</span>
                          </div>
                          <pre>{activeThread.latestDraft.body}</pre>
                          <ul>
                            {activeThread.latestDraft.checklist.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          <div className="supplier-actions">
                            <button
                              onClick={() => handleApproveSend(activeThread.id)}
                              type="button"
                              disabled={mailbox?.status !== "connected"}
                            >
                              승인 후 발송
                            </button>
                          </div>
                        </article>
                      ) : (
                        <div className="empty-inline">현재 스레드에 초안이 없습니다.</div>
                      )}

                      <div className="thread-reply-box">
                        <textarea
                          rows={5}
                          value={supplierReplyText}
                          onChange={(event) => setSupplierReplyText(event.target.value)}
                          placeholder="공급처가 보낸 답장을 붙여넣으면 후속 협상 초안을 생성합니다."
                        />
                        <button className="inline-button" onClick={() => handleDraftReply(activeThread.id)} type="button">
                          답장 초안 만들기
                        </button>
                      </div>

                      <div className="message-list">
                        {activeThread.messages.length ? (
                          activeThread.messages.map((message) => (
                            <article key={message.id} className={`message-card message-${message.direction}`}>
                              <div className="inline-head">
                                <strong>{message.subject}</strong>
                                <span>{message.direction}</span>
                              </div>
                              <p>{message.summary}</p>
                              {message.extractedTerms?.notes.length ? (
                                <div className="reason-list">
                                  {message.extractedTerms.notes.map((note) => (
                                    <span key={note} className="reason-pill">
                                      {note}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <div className="empty-inline">발송/수신된 메시지 히스토리가 여기에 표시됩니다.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-inline">문의 초안을 만들면 이곳에서 협상을 이어갈 수 있습니다.</div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="score-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function splitTags(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function modeLabel(mode: SourcingIntakeInput["mode"]) {
  return mode === "explore_anything" ? "광범위 탐색" : "카테고리 집중";
}

function riskLabel(value: RiskLevel) {
  switch (value) {
    case "low":
      return "낮음";
    case "medium":
      return "주의";
    case "high":
      return "높음";
    default:
      return value;
  }
}

function runStatusLabel(status?: DiscoveryRunDetail["status"]) {
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
      return "대기";
  }
}

function mailboxStatusLabel(status?: MailboxConnection["status"]) {
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

function mailboxStatusCopy(status?: MailboxConnection["status"]) {
  switch (status) {
    case "connected":
      return "승인 후 발송과 협상 스레드 관리를 진행할 수 있습니다.";
    case "oauth_pending":
      return "OAuth 인증을 마치면 실메일 발송까지 연결할 수 있습니다.";
    case "setup_required":
      return "현재는 데모 메일함 연결을 사용하거나 Google 환경변수를 설정해 주세요.";
    case "not_connected":
    default:
      return "초안 생성은 가능하지만 실제 발송 전에는 메일함 연결이 필요합니다.";
  }
}

function stageLabel(stage: DiscoveryRunDetail["currentStage"]) {
  switch (stage) {
    case "intake":
      return "인테이크 정리";
    case "discovery":
      return "상품 탐색";
    case "trend_enrichment":
      return "트렌드 보강";
    case "evaluation":
      return "상품 평가";
    case "supplier_research":
      return "공급처 조사";
    case "contact_ready":
      return "연락 준비";
    case "negotiation":
      return "협상";
    default:
      return stage;
  }
}

function supplierName(candidate: ProductCandidate, thread: NegotiationThread) {
  return candidate.supplierLeads.find((supplier) => supplier.id === thread.supplierLeadId)?.supplierName ?? "공급처";
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
