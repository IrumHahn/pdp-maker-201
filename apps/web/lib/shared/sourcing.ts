export type SourcingIntakeMode = "explore_anything" | "focus_category";
export type PreferenceLevel = "low" | "medium" | "high";
export type HotTrack = "BURST" | "STEADY" | "EMERGING";
export type RiskLevel = "low" | "medium" | "high";
export type CompetitionLevel = "low" | "medium" | "high";
export type OpportunityType = "global_popular" | "hidden_gem" | "focus_match";
export type ProductEvidenceSourceType = "marketplace" | "social" | "search" | "community";
export type SupplierSourceSite = "Alibaba" | "1688" | "Global Sources";
export type SourcingRunStatus = "queued" | "running" | "completed" | "failed";
export type SourcingRunStage =
  | "intake"
  | "discovery"
  | "trend_enrichment"
  | "evaluation"
  | "supplier_research"
  | "contact_ready"
  | "negotiation";
export type RunStageStatus = "pending" | "active" | "completed" | "failed" | "blocked";
export type AgentKind = "orchestrator" | "search" | "trend" | "evaluation" | "sourcing" | "negotiation";
export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "blocked";
export type CompetitionReportStatus = "not_started" | "ready" | "needs_input" | "failed";
export type SupplierStatus = "not_started" | "ready" | "blocked";
export type MailboxProvider = "google";
export type MailboxConnectionStatus = "not_connected" | "oauth_pending" | "connected" | "setup_required";
export type NegotiationThreadStatus =
  | "draft"
  | "awaiting_approval"
  | "sent"
  | "awaiting_supplier"
  | "supplier_replied"
  | "ready_to_reply"
  | "closed";
export type NegotiationMessageDirection = "outbound" | "inbound" | "internal";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface SourcingIntakeInput {
  mode: SourcingIntakeMode;
  interests: string[];
  excludedCategories: string[];
  targetPriceBand: string;
  targetMarginPercent: number;
  shippingSensitivity: PreferenceLevel;
  regulationSensitivity: PreferenceLevel;
  sourcingCountries: string[];
  notes?: string;
}

export interface SourcingIntake extends SourcingIntakeInput {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductEvidence {
  id: string;
  sourceName: string;
  sourceType: ProductEvidenceSourceType;
  sourceUrl: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  confidence: number;
  capturedAt: string;
}

export interface ScoreBreakdown {
  demandScore: number;
  trendScore: number;
  koreaFitScore: number;
  sourcingEaseScore: number;
  riskAdjustedScore: number;
  overallScore: number;
}

export interface CompetitionReport {
  id: string;
  candidateId: string;
  status: CompetitionReportStatus;
  source: "naver_api" | "manual_snapshot" | "estimate";
  keyword: string;
  priceMinKrw: number;
  priceMedianKrw: number;
  priceMaxKrw: number;
  sellerDensity: string;
  reviewDensity: string;
  searchInterest: string;
  competitionLevel: CompetitionLevel;
  competitionSummary: string;
  insightSummary: string;
  riskSummary: string;
  differentiationIdeas: string[];
  confidence: number;
  collectedAt: string;
}

export interface SupplierSearchLink {
  label: string;
  url: string;
}

export interface SupplierLead {
  id: string;
  candidateId: string;
  sourceSite: SupplierSourceSite;
  supplierName: string;
  supplierCountry: string;
  moq: string;
  unitPriceRange: string;
  leadTime: string;
  confidence: number;
  contactNote: string;
  riskLevel: RiskLevel;
  searchUrl: string;
  sampleAvailable: boolean;
  oemAvailable: boolean;
  capabilitySummary: string;
  contactEmail?: string;
}

export interface OutreachDraft {
  id: string;
  candidateId: string;
  supplierLeadId: string;
  threadId: string;
  subject: string;
  body: string;
  checklist: string[];
  createdAt: string;
  status: "draft" | "approved" | "sent";
}

export interface NegotiationGuardrails {
  targetUnitPriceUsd: number;
  maxMoq: number;
  askSample: boolean;
  desiredIncoterm: string;
  bannedPhrases: string[];
}

export interface NegotiationExtractedTerms {
  moq?: string;
  unitPriceRange?: string;
  leadTime?: string;
  sampleAvailable?: boolean;
  notes: string[];
}

export interface NegotiationMessage {
  id: string;
  threadId: string;
  direction: NegotiationMessageDirection;
  subject: string;
  body: string;
  summary: string;
  extractedTerms?: NegotiationExtractedTerms;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  threadId: string;
  draftId: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
}

export interface NegotiationThread {
  id: string;
  candidateId: string;
  supplierLeadId: string;
  mailboxConnectionId?: string;
  status: NegotiationThreadStatus;
  summary: string;
  nextRecommendedAction: string;
  latestDraft?: OutreachDraft;
  messages: NegotiationMessage[];
  guardrails: NegotiationGuardrails;
  pendingApproval?: ApprovalRequest;
  createdAt: string;
  updatedAt: string;
}

export interface MailboxConnection {
  id: string;
  userId: string;
  provider: MailboxProvider;
  status: MailboxConnectionStatus;
  email?: string;
  displayName?: string;
  scope: string[];
  authUrl?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  isMock: boolean;
}

export interface ProductCandidateSummary {
  id: string;
  runId: string;
  canonicalName: string;
  localizedName: string;
  category: string;
  track: HotTrack;
  whyHot: string;
  targetCustomer: string;
  koreanAngle: string;
  riskLevel: RiskLevel;
  riskLabels: string[];
  scores: ScoreBreakdown;
  evidenceCount: number;
  opportunityType: OpportunityType;
  opportunityTitle: string;
  globalPopularityLabel: string;
  hiddenOpportunityLabel: string;
  koreaCompetitionLabel: string;
  estimatedMarginPercent: number;
  evaluationReasons: string[];
  competitionStatus: CompetitionReportStatus;
  supplierStatus: SupplierStatus;
}

export interface ProductCandidate extends ProductCandidateSummary {
  whoShouldSell: string;
  notes: string;
  recommendedActions: string[];
  evidence: ProductEvidence[];
  supplierSearchLinks: SupplierSearchLink[];
  competitionReport?: CompetitionReport;
  supplierLeads: SupplierLead[];
  negotiationThreads: NegotiationThread[];
}

export interface RunStageSnapshot {
  stage: SourcingRunStage;
  label: string;
  status: RunStageStatus;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  runId: string;
  stage: SourcingRunStage;
  agent: AgentKind;
  status: AgentTaskStatus;
  title: string;
  summary: string;
  inputSummary?: string;
  outputSummary?: string;
  retries: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DiscoveryRun {
  id: string;
  intakeId: string;
  userId: string;
  status: SourcingRunStatus;
  currentStage: SourcingRunStage;
  stageLabel: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  summary?: string;
  candidateIds: string[];
  candidateCount: number;
  stages: RunStageSnapshot[];
}

export interface DiscoveryRunDetail extends DiscoveryRun {
  candidates: ProductCandidateSummary[];
  tasks: AgentTask[];
  mailboxConnectionStatus: MailboxConnectionStatus;
  readyForNegotiation: boolean;
}

export type SourcingAdminMetricTone = "stable" | "attention" | "progress";
export type SourcingAdminReviewKind =
  | "manual_competition"
  | "supplier_blocked"
  | "approval_pending"
  | "mailbox_setup";

export interface SourcingAdminMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: SourcingAdminMetricTone;
}

export interface SourcingAdminReviewItem {
  id: string;
  kind: SourcingAdminReviewKind;
  priority: RiskLevel;
  title: string;
  subtitle: string;
  detail: string;
  actionLabel: string;
  runId: string;
  candidateId?: string;
  threadId?: string;
  supplierLeadId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingAdminRunSummary {
  id: string;
  intakeId: string;
  intakeMode: SourcingIntakeMode;
  interestSummary: string;
  status: SourcingRunStatus;
  currentStage: SourcingRunStage;
  stageLabel: string;
  candidateCount: number;
  topCandidateName?: string;
  topCandidateScore?: number;
  mailboxConnectionStatus: MailboxConnectionStatus;
  openReviewItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingAdminReviewBoard {
  generatedAt: string;
  metrics: SourcingAdminMetric[];
  reviewQueue: SourcingAdminReviewItem[];
  recentRuns: SourcingAdminRunSummary[];
}

export interface QueueReadiness {
  queueName: (typeof SOURCING_QUEUE_NAMES)[number];
  connected: boolean;
  detail: string;
}

export const SOURCING_SCORE_WEIGHTS = {
  demand: 30,
  trend: 20,
  koreaFit: 25,
  sourcingEase: 15,
  riskAdjusted: 10
} as const;

export const SOURCING_STAGE_ORDER = [
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

export const SOURCING_QUEUE_NAMES = [
  "sourcing.discovery",
  "sourcing.trends",
  "sourcing.evaluation",
  "sourcing.suppliers",
  "sourcing.negotiation"
] as const;
