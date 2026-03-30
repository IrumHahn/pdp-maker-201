import type { SourcingRunStage } from "@runacademy/shared";

export type {
  AgentKind,
  AgentTask,
  AgentTaskStatus,
  ApprovalRequest,
  ApprovalStatus,
  CompetitionLevel,
  CompetitionReport,
  CompetitionReportStatus,
  DiscoveryRun,
  DiscoveryRunDetail,
  HotTrack,
  MailboxConnection,
  MailboxConnectionStatus,
  MailboxProvider,
  NegotiationExtractedTerms,
  NegotiationGuardrails,
  NegotiationMessage,
  NegotiationMessageDirection,
  NegotiationThread,
  NegotiationThreadStatus,
  OpportunityType,
  OutreachDraft,
  PreferenceLevel,
  ProductCandidate,
  ProductCandidateSummary,
  ProductEvidence,
  ProductEvidenceSourceType,
  QueueReadiness,
  RiskLevel,
  RunStageSnapshot,
  RunStageStatus,
  ScoreBreakdown,
  SourcingAdminMetric,
  SourcingAdminMetricTone,
  SourcingAdminReviewBoard,
  SourcingAdminReviewItem,
  SourcingAdminReviewKind,
  SourcingAdminRunSummary,
  SourcingIntake,
  SourcingIntakeInput,
  SourcingIntakeMode,
  SourcingRunStage,
  SourcingRunStatus,
  SupplierLead,
  SupplierSearchLink,
  SupplierSourceSite,
  SupplierStatus
} from "@runacademy/shared";

export const SOURCING_SCORE_WEIGHTS = {
  demand: 30,
  trend: 20,
  koreaFit: 25,
  sourcingEase: 15,
  riskAdjusted: 10
} as const;

export const SOURCING_STAGE_ORDER: readonly SourcingRunStage[] = [
  "intake",
  "discovery",
  "trend_enrichment",
  "evaluation",
  "supplier_research",
  "contact_ready",
  "negotiation"
] as const;

export const SOURCING_STAGE_LABELS: Record<SourcingRunStage, string> = {
  intake: "인테이크 정리",
  discovery: "상품 탐색",
  trend_enrichment: "트렌드 보강",
  evaluation: "상품 평가",
  supplier_research: "공급처 조사",
  contact_ready: "연락 준비",
  negotiation: "협상"
};
