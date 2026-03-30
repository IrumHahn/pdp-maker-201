import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { GLOBAL_PRODUCT_CATALOG, type CatalogEntry } from "./sourcing.catalog";
import { SourcingStoreService } from "./sourcing.store";
import {
  SOURCING_SCORE_WEIGHTS,
  SOURCING_STAGE_LABELS,
  SOURCING_STAGE_ORDER,
  type SourcingAdminMetric,
  type SourcingAdminReviewBoard,
  type SourcingAdminReviewItem,
  type SourcingAdminRunSummary,
  type AgentKind,
  type AgentTask,
  type ApprovalRequest,
  type CompetitionLevel,
  type CompetitionReport,
  type CompetitionReportStatus,
  type DiscoveryRun,
  type DiscoveryRunDetail,
  type MailboxConnection,
  type MailboxConnectionStatus,
  type NegotiationExtractedTerms,
  type NegotiationGuardrails,
  type NegotiationMessage,
  type NegotiationThread,
  type OpportunityType,
  type OutreachDraft,
  type ProductCandidate,
  type ProductCandidateSummary,
  type RiskLevel,
  type RunStageSnapshot,
  type ScoreBreakdown,
  type SourcingIntake,
  type SourcingIntakeInput,
  type SourcingRunStage,
  type SupplierLead,
  type SupplierSearchLink
} from "./sourcing.types";

const DEFAULT_USER_ID = "demo-user";
const BLOCK_SENSITIVE_HOSTS = ["coupang.com", "smartstore.naver.com", "brand.naver.com"];
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
] as const;

interface CompetitionRefreshInput {
  url?: string;
  pageSnapshotText?: string;
  reviewSnapshotText?: string;
}

interface DraftInquiryInput {
  guardrails?: Partial<NegotiationGuardrails>;
}

interface DraftReplyInput {
  supplierReplyText?: string;
}

interface GoogleConnectStartInput {
  redirectUri?: string;
}

interface GoogleConnectCompleteInput {
  code?: string;
  redirectUri?: string;
  email?: string;
  displayName?: string;
}

interface RunSearchContext {
  interestTokens: string[];
  excludedTokens: string[];
}

interface TrendSignal {
  globalPopularityLabel: string;
  hiddenOpportunityLabel: string;
  evaluationReasons: string[];
}

interface NaverSearchItem {
  title: string;
  lprice: string;
  hprice: string;
  mallName: string;
}

interface NaverSearchResponse {
  total: number;
  items: NaverSearchItem[];
}

@Injectable()
export class SourcingService {
  constructor(private readonly store: SourcingStoreService) {}

  async createIntake(input: SourcingIntakeInput) {
    const intake: SourcingIntake = {
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      mode: input.mode,
      interests: unique(input.interests.map(normalizeWhitespace).filter(Boolean)),
      excludedCategories: unique(input.excludedCategories.map(normalizeWhitespace).filter(Boolean)),
      targetPriceBand: normalizeWhitespace(input.targetPriceBand) || "1만~5만원",
      targetMarginPercent: clamp(Math.round(input.targetMarginPercent || 35), 10, 80),
      shippingSensitivity: input.shippingSensitivity,
      regulationSensitivity: input.regulationSensitivity,
      sourcingCountries: unique(input.sourcingCountries.map(normalizeWhitespace).filter(Boolean)),
      notes: normalizeWhitespace(input.notes) || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    await this.store.mutate((data) => {
      data.intakes.push(intake);
    });

    return {
      ok: true,
      intake
    };
  }

  async startRun(intakeId: string) {
    const intake = await this.store.read((data) => data.intakes.find((item) => item.id === intakeId));

    if (!intake) {
      return {
        ok: false,
        code: "INTAKE_NOT_FOUND",
        message: "intakeId에 해당하는 소싱 인테이크가 없습니다."
      };
    }

    const run: DiscoveryRun = {
      id: randomUUID(),
      intakeId,
      userId: intake.userId,
      status: "queued",
      currentStage: "intake",
      stageLabel: "총괄 에이전트가 요청을 정리하고 있습니다.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      candidateIds: [],
      candidateCount: 0,
      stages: buildInitialStages()
    };

    await this.store.mutate((data) => {
      data.runs.push(run);
    });

    setTimeout(() => {
      void this.processRun(run.id);
    }, 40);

    return {
      ok: true,
      run: await this.buildRunDetailById(run.id)
    };
  }

  async getRun(runId: string) {
    const run = await this.buildRunDetailById(runId);

    if (!run) {
      return {
        ok: false,
        code: "RUN_NOT_FOUND",
        message: "runId에 해당하는 소싱 런이 없습니다."
      };
    }

    return {
      ok: true,
      run
    };
  }

  async getAdminReviewBoard() {
    return this.store.read((data) => {
      const reviewQueue = buildAdminReviewQueue(data.runs, data.intakes, data.candidates, data.mailboxConnections);
      const recentRuns = buildAdminRunSummaries(
        data.runs,
        data.intakes,
        data.candidates,
        data.mailboxConnections,
        reviewQueue
      );

      const board: SourcingAdminReviewBoard = {
        generatedAt: nowIso(),
        metrics: buildAdminMetrics(data.runs, data.candidates, data.mailboxConnections, reviewQueue),
        reviewQueue,
        recentRuns
      };

      return {
        ok: true as const,
        board
      };
    });
  }

  async getCandidate(candidateId: string) {
    return this.store.read((data) => {
      const candidate = data.candidates.find((item) => item.id === candidateId);

      if (!candidate) {
        return {
          ok: false as const,
          code: "CANDIDATE_NOT_FOUND",
          message: "candidateId에 해당하는 상품 후보가 없습니다."
        };
      }

      return {
        ok: true as const,
        candidate
      };
    });
  }

  async refreshCompetitionReport(candidateId: string, input: CompetitionRefreshInput) {
    const seed = await this.store.read((data) => {
      const candidate = data.candidates.find((item) => item.id === candidateId);
      const run = candidate ? data.runs.find((item) => item.id === candidate.runId) : undefined;

      return {
        candidate,
        run
      };
    });

    if (!seed.candidate || !seed.run) {
      return {
        ok: false,
        code: "CANDIDATE_NOT_FOUND",
        message: "candidateId에 해당하는 상품 후보가 없습니다."
      };
    }

    const pageSnapshotText = normalizeWhitespace(input.pageSnapshotText);
    const reviewSnapshotText = normalizeWhitespace(input.reviewSnapshotText);
    const requestedUrl = normalizeWhitespace(input.url);

    if (requestedUrl && isBlockedSensitiveHost(requestedUrl) && !pageSnapshotText && !this.hasNaverCredentials()) {
      await this.store.mutate((data) => {
        const target = data.candidates.find((item) => item.id === candidateId);
        if (!target) {
          return;
        }

        target.competitionStatus = "needs_input";
      });

      return {
        ok: false,
        code: "MANUAL_SNAPSHOT_REQUIRED",
        message: "차단 가능성이 있는 국내 마켓 URL입니다. 스냅샷 텍스트를 붙여넣거나 NAVER API를 설정해 주세요."
      };
    }

    const task = await this.startTask(
      seed.run.id,
      "trend_enrichment",
      "trend",
      "한국 경쟁 분석 갱신",
      `후보: ${seed.candidate.localizedName}`
    );
    await this.beginInteractiveStage(seed.run.id, "trend_enrichment");

    let report: CompetitionReport;

    try {
      const naverReport = await this.fetchNaverCompetitionReport(seed.candidate, {
        pageSnapshotText,
        reviewSnapshotText
      });

      if (naverReport) {
        report = naverReport;
      } else {
        report = this.buildCompetitionReport(seed.candidate, {
          source: pageSnapshotText || reviewSnapshotText ? "manual_snapshot" : "estimate",
          manualSignal: `${pageSnapshotText} ${reviewSnapshotText}`,
          requestedUrl
        });
      }

      const candidate = await this.store.mutate((data) => {
        const target = data.candidates.find((item) => item.id === candidateId);

        if (!target) {
          return null;
        }

        target.competitionReport = report;
        target.competitionStatus = report.status;
        target.koreaCompetitionLabel = competitionLevelLabel(report.competitionLevel);
        target.evaluationReasons = refreshEvaluationReasons(target, report);
        return structuredClone(target);
      });

      if (!candidate) {
        return {
          ok: false,
          code: "CANDIDATE_NOT_FOUND",
          message: "candidateId에 해당하는 상품 후보가 없습니다."
        };
      }

      await this.completeTask(
        task.id,
        "한국 경쟁 리포트를 갱신했습니다.",
        `${report.source} 기반 리포트, 신뢰도 ${Math.round(report.confidence * 100)}%`
      );
      await this.completeInteractiveStage(seed.run.id, "trend_enrichment", "한국 경쟁 분석이 업데이트되었습니다.");

      return {
        ok: true,
        report,
        candidate
      };
    } catch (error) {
      await this.failTask(task.id, error instanceof Error ? error.message : "경쟁 분석 갱신 실패");
      await this.failStage(seed.run.id, "trend_enrichment", "한국 경쟁 분석 갱신에 실패했습니다.");

      return {
        ok: false,
        code: "COMPETITION_REPORT_FAILED",
        message: "한국 경쟁 분석을 갱신하지 못했습니다."
      };
    }
  }

  async refreshSuppliers(candidateId: string) {
    const seed = await this.store.read((data) => {
      const candidate = data.candidates.find((item) => item.id === candidateId);
      const run = candidate ? data.runs.find((item) => item.id === candidate.runId) : undefined;

      return {
        candidate,
        run
      };
    });

    if (!seed.candidate || !seed.run) {
      return {
        ok: false,
        code: "CANDIDATE_NOT_FOUND",
        message: "candidateId에 해당하는 상품 후보가 없습니다."
      };
    }

    const task = await this.startTask(
      seed.run.id,
      "supplier_research",
      "sourcing",
      "공급처 후보 리프레시",
      `후보: ${seed.candidate.localizedName}`
    );
    await this.beginInteractiveStage(seed.run.id, "supplier_research");

    if (seed.candidate.riskLevel === "high") {
      await this.blockTask(task.id, "고위험 상품은 자동 소싱 추천이 차단됩니다.");
      await this.completeInteractiveStage(seed.run.id, "supplier_research", "고위험 상품은 수동 검토가 필요합니다.");

      const candidate = await this.store.mutate((data) => {
        const target = data.candidates.find((item) => item.id === candidateId);
        if (!target) {
          return null;
        }

        target.supplierStatus = "blocked";
        return structuredClone(target);
      });

      return {
        ok: false,
        code: "RISK_BLOCKED",
        message: "지재권 또는 규제 리스크가 높아 자동 소싱 추천을 중단했습니다.",
        candidate
      };
    }

    const suppliers = this.buildSupplierLeads(seed.candidate);

    const candidate = await this.store.mutate((data) => {
      const target = data.candidates.find((item) => item.id === candidateId);
      if (!target) {
        return null;
      }

      target.supplierLeads = suppliers;
      target.supplierStatus = "ready";
      return structuredClone(target);
    });

    if (!candidate) {
      return {
        ok: false,
        code: "CANDIDATE_NOT_FOUND",
        message: "candidateId에 해당하는 상품 후보가 없습니다."
      };
    }

    await this.completeTask(task.id, "Alibaba 우선 공급처 후보를 생성했습니다.", `${suppliers.length}개 공급처 후보 확보`);
    await this.completeInteractiveStage(seed.run.id, "supplier_research", "공급처 후보가 준비되었습니다.");

    return {
      ok: true,
      suppliers,
      candidate
    };
  }

  async getGoogleMailboxConnection() {
    const connection = await this.getMailboxConnection();

    return {
      ok: true,
      connection
    };
  }

  async startGoogleConnect(input: GoogleConnectStartInput = {}) {
    const clientId = normalizeWhitespace(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = normalizeWhitespace(input.redirectUri) || normalizeWhitespace(process.env.GOOGLE_REDIRECT_URI);
    const connection = await this.getMailboxConnection();

    if (!clientId || !redirectUri) {
      const updated = await this.store.mutate((data) => {
        const target = upsertMailboxConnection(data, connection, {
          status: "setup_required",
          authUrl: undefined,
          scope: [...GOOGLE_OAUTH_SCOPES],
          isMock: true
        });

        return structuredClone(target);
      });

      return {
        ok: true,
        connection: updated,
        setupRequired: true,
        instructions: [
          "GOOGLE_CLIENT_ID 와 GOOGLE_REDIRECT_URI를 설정하면 실제 OAuth URL을 만들 수 있습니다.",
          "설정 전에는 complete 엔드포인트로 데모 메일함 연결을 진행할 수 있습니다."
        ]
      };
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
    authUrl.searchParams.set("state", randomUUID());

    const updated = await this.store.mutate((data) => {
      const target = upsertMailboxConnection(data, connection, {
        status: "oauth_pending",
        authUrl: authUrl.toString(),
        scope: [...GOOGLE_OAUTH_SCOPES],
        isMock: false
      });

      return structuredClone(target);
    });

    return {
      ok: true,
      connection: updated,
      setupRequired: false
    };
  }

  async completeGoogleConnect(input: GoogleConnectCompleteInput = {}) {
    const baseConnection = await this.getMailboxConnection();
    const clientId = normalizeWhitespace(process.env.GOOGLE_CLIENT_ID);
    const clientSecret = normalizeWhitespace(process.env.GOOGLE_CLIENT_SECRET);
    const redirectUri = normalizeWhitespace(input.redirectUri) || normalizeWhitespace(process.env.GOOGLE_REDIRECT_URI);

    if (input.code && clientId && clientSecret && redirectUri) {
      try {
        const token = await exchangeGoogleCode({
          clientId,
          clientSecret,
          code: input.code,
          redirectUri
        });
        const profile = await fetchGoogleProfile(token.accessToken);

        const connection = await this.store.mutate((data) => {
          const target = upsertMailboxConnection(data, baseConnection, {
            status: "connected",
            email: profile.email,
            displayName: profile.name,
            scope: [...GOOGLE_OAUTH_SCOPES],
            authUrl: undefined,
            connectedAt: nowIso(),
            lastSyncedAt: nowIso(),
            isMock: false
          });

          data.mailboxSecrets[target.id] = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt
          };

          return structuredClone(target);
        });

        return {
          ok: true,
          connection,
          mode: "google_oauth"
        };
      } catch (error) {
        return {
          ok: false,
          code: "GOOGLE_CONNECT_FAILED",
          message: error instanceof Error ? error.message : "Google 연결에 실패했습니다."
        };
      }
    }

    if (normalizeWhitespace(input.email)) {
      const connection = await this.store.mutate((data) => {
        const target = upsertMailboxConnection(data, baseConnection, {
          status: "connected",
          email: normalizeWhitespace(input.email),
          displayName: normalizeWhitespace(input.displayName) || "Demo Mailbox",
          scope: [...GOOGLE_OAUTH_SCOPES],
          authUrl: undefined,
          connectedAt: nowIso(),
          lastSyncedAt: nowIso(),
          isMock: true
        });

        delete data.mailboxSecrets[target.id];
        return structuredClone(target);
      });

      return {
        ok: true,
        connection,
        mode: "mock_connected"
      };
    }

    return {
      ok: false,
      code: "SETUP_REQUIRED",
      message: "실제 Google OAuth 설정이 없으면 email 값을 함께 보내 데모 연결을 진행해 주세요."
    };
  }

  async draftInquiry(supplierLeadId: string, input: DraftInquiryInput = {}) {
    const seed = await this.store.read((data) => findCandidateAndLead(data.candidates, supplierLeadId));

    if (!seed) {
      return {
        ok: false,
        code: "SUPPLIER_NOT_FOUND",
        message: "supplierLeadId에 해당하는 공급처 후보가 없습니다."
      };
    }

    const connection = await this.getMailboxConnection();
    const guardrails = buildGuardrails(seed.supplierLead, input.guardrails);
    const draft = createInquiryDraft(seed.candidate, seed.supplierLead, guardrails);
    const pendingApproval =
      connection.status === "connected"
        ? createApprovalRequest({
            threadId: "",
            draftId: draft.id
          })
        : undefined;

    const updated = await this.store.mutate((data) => {
      const targetCandidate = data.candidates.find((item) => item.id === seed.candidate.id);
      if (!targetCandidate) {
        return null;
      }

      const threadIndex = targetCandidate.negotiationThreads.findIndex(
        (thread) => thread.supplierLeadId === seed.supplierLead.id
      );
      const threadId = threadIndex >= 0 ? targetCandidate.negotiationThreads[threadIndex].id : randomUUID();
      const approval = pendingApproval ? { ...pendingApproval, threadId } : undefined;

      const nextThread: NegotiationThread = {
        id: threadId,
        candidateId: targetCandidate.id,
        supplierLeadId: seed.supplierLead.id,
        mailboxConnectionId: connection.status === "connected" ? connection.id : undefined,
        status: connection.status === "connected" ? "awaiting_approval" : "draft",
        summary:
          connection.status === "connected"
            ? "첫 문의 메일 초안이 생성되어 승인 대기 중입니다."
            : "메일함 연결 전이라 초안만 준비되었습니다.",
        nextRecommendedAction:
          connection.status === "connected" ? "초안을 검토하고 승인하세요." : "Google 메일함을 연결하세요.",
        latestDraft: {
          ...draft,
          threadId,
          status: "draft"
        },
        messages:
          threadIndex >= 0 ? targetCandidate.negotiationThreads[threadIndex].messages : [],
        guardrails,
        pendingApproval: approval,
        createdAt:
          threadIndex >= 0 ? targetCandidate.negotiationThreads[threadIndex].createdAt : nowIso(),
        updatedAt: nowIso()
      };

      if (threadIndex >= 0) {
        targetCandidate.negotiationThreads[threadIndex] = nextThread;
      } else {
        targetCandidate.negotiationThreads.unshift(nextThread);
      }

      return {
        candidate: structuredClone(targetCandidate),
        thread: structuredClone(nextThread),
        approval
      };
    });

    if (!updated) {
      return {
        ok: false,
        code: "SUPPLIER_NOT_FOUND",
        message: "supplierLeadId에 해당하는 공급처 후보가 없습니다."
      };
    }

    await this.beginInteractiveStage(seed.candidate.runId, "contact_ready");
    await this.completeInteractiveStage(seed.candidate.runId, "contact_ready", "협상 초안이 준비되었습니다.");

    return {
      ok: true,
      thread: updated.thread,
      draft: updated.thread.latestDraft,
      approvalRequest: updated.approval,
      candidate: updated.candidate,
      supplierLead: seed.supplierLead,
      mailboxConnectionStatus: connection.status
    };
  }

  async approveSend(threadId: string) {
    const connection = await this.getMailboxConnection();

    if (connection.status !== "connected") {
      return {
        ok: false,
        code: "MAILBOX_NOT_CONNECTED",
        message: "메일 발송 전에 Google 메일함을 연결해 주세요."
      };
    }

    const result = await this.store.mutate(async (data) => {
      const found = findThreadById(data.candidates, threadId);
      if (!found || !found.thread.latestDraft || !found.thread.pendingApproval) {
        return null;
      }

      const draft = found.thread.latestDraft;
      const supplier = found.candidate.supplierLeads.find((item) => item.id === found.thread.supplierLeadId);
      if (!supplier) {
        return null;
      }

      const secret = data.mailboxSecrets[connection.id];
      let deliveryMode: "mock" | "gmail_api" = "mock";

      if (!connection.isMock && secret?.accessToken && supplier.contactEmail) {
        await sendViaGmail(secret.accessToken, {
          from: connection.email ?? "me",
          to: supplier.contactEmail,
          subject: draft.subject,
          body: draft.body
        });
        deliveryMode = "gmail_api";
      }

      const outboundMessage: NegotiationMessage = {
        id: randomUUID(),
        threadId,
        direction: "outbound",
        subject: draft.subject,
        body: draft.body,
        summary:
          deliveryMode === "gmail_api"
            ? "Gmail API로 문의 메일을 발송했습니다."
            : "데모 전송으로 문의 메일이 발송 처리되었습니다.",
        createdAt: nowIso()
      };

      found.thread.latestDraft = {
        ...draft,
        status: "sent"
      };
      found.thread.pendingApproval = {
        ...found.thread.pendingApproval,
        status: "approved",
        decidedAt: nowIso()
      };
      found.thread.messages.unshift(outboundMessage);
      found.thread.status = "awaiting_supplier";
      found.thread.summary =
        deliveryMode === "gmail_api"
          ? "첫 문의 메일이 Gmail로 발송되었습니다."
          : "첫 문의 메일이 데모 전송으로 처리되었습니다.";
      found.thread.nextRecommendedAction = "공급처 답장을 기다리거나 받은 메일 내용을 붙여넣으세요.";
      found.thread.updatedAt = nowIso();

      return {
        thread: structuredClone(found.thread),
        candidate: structuredClone(found.candidate),
        deliveryMode,
        sentMessage: outboundMessage
      };
    });

    if (!result) {
      return {
        ok: false,
        code: "THREAD_NOT_FOUND",
        message: "승인할 협상 스레드를 찾지 못했습니다."
      };
    }

    await this.beginInteractiveStage(result.candidate.runId, "negotiation");

    return {
      ok: true,
      thread: result.thread,
      candidate: result.candidate,
      deliveryMode: result.deliveryMode,
      sentMessage: result.sentMessage
    };
  }

  async draftReply(threadId: string, input: DraftReplyInput = {}) {
    const connection = await this.getMailboxConnection();

    const result = await this.store.mutate((data) => {
      const found = findThreadById(data.candidates, threadId);
      if (!found) {
        return null;
      }

      const supplier = found.candidate.supplierLeads.find((item) => item.id === found.thread.supplierLeadId);
      if (!supplier) {
        return null;
      }

      const supplierReplyText = normalizeWhitespace(input.supplierReplyText);
      let latestInbound = found.thread.messages.find((message) => message.direction === "inbound");

      if (supplierReplyText) {
        latestInbound = {
          id: randomUUID(),
          threadId,
          direction: "inbound",
          subject: `Re: ${found.thread.latestDraft?.subject ?? found.candidate.localizedName}`,
          body: supplierReplyText,
          summary: summarizeSupplierReply(supplierReplyText),
          extractedTerms: extractTermsFromReply(supplierReplyText),
          createdAt: nowIso()
        };

        found.thread.messages.unshift(latestInbound);
      }

      if (!latestInbound) {
        return {
          kind: "needs_reply" as const
        };
      }

      const draft = createReplyDraft(found.candidate, supplier, found.thread.guardrails, latestInbound);
      const approval =
        connection.status === "connected"
          ? createApprovalRequest({
              threadId,
              draftId: draft.id
            })
          : undefined;

      found.thread.latestDraft = {
        ...draft,
        threadId,
        status: "draft"
      };
      found.thread.pendingApproval = approval;
      found.thread.status = connection.status === "connected" ? "awaiting_approval" : "ready_to_reply";
      found.thread.summary = "공급처 답장을 반영한 후속 협상 초안이 준비되었습니다.";
      found.thread.nextRecommendedAction =
        connection.status === "connected" ? "초안을 승인해 전송하세요." : "메일함 연결 후 전송하세요.";
      found.thread.updatedAt = nowIso();

      return {
        kind: "success" as const,
        thread: structuredClone(found.thread),
        candidate: structuredClone(found.candidate),
        supplierLead: structuredClone(supplier),
        latestInbound
      };
    });

    if (!result) {
      return {
        ok: false,
        code: "THREAD_NOT_FOUND",
        message: "협상 스레드를 찾지 못했습니다."
      };
    }

    if (result.kind === "needs_reply") {
      return {
        ok: false,
        code: "SUPPLIER_REPLY_REQUIRED",
        message: "공급처의 답장 텍스트를 붙여넣으면 후속 협상 초안을 만들 수 있습니다."
      };
    }

    await this.beginInteractiveStage(result.candidate.runId, "negotiation");

    return {
      ok: true,
      thread: result.thread,
      candidate: result.candidate,
      supplierLead: result.supplierLead,
      latestSupplierReply: result.latestInbound
    };
  }

  private async processRun(runId: string) {
    const seed = await this.store.read((data) => {
      const run = data.runs.find((item) => item.id === runId);
      const intake = run ? data.intakes.find((item) => item.id === run.intakeId) : undefined;

      return {
        run,
        intake
      };
    });

    if (!seed.run || !seed.intake) {
      return;
    }

    try {
      await this.beginInteractiveStage(runId, "intake");

      const orchestratorTask = await this.startTask(
        runId,
        "intake",
        "orchestrator",
        "인테이크 정규화",
        `${seed.intake.mode} / ${seed.intake.interests.join(", ") || "broad"}`
      );
      await sleep(80);
      await this.completeTask(orchestratorTask.id, "인테이크를 표준화했습니다.", "제약조건과 탐색 모드를 확인했습니다.");
      await this.markStage(runId, "intake", "completed");

      await this.beginInteractiveStage(runId, "discovery");
      await this.markStage(runId, "trend_enrichment", "active");

      const searchTask = await this.startTask(
        runId,
        "discovery",
        "search",
        "글로벌 후보 탐색",
        "시드 카탈로그와 관심 키워드를 조합합니다."
      );
      const trendTask = await this.startTask(
        runId,
        "trend_enrichment",
        "trend",
        "트렌드 신호 보강",
        "공개 검색/콘텐츠/커머스 신호를 해석합니다."
      );

      await sleep(100);
      const discovered = this.searchAgent(seed.intake);
      const trendSignals = this.trendAgent(discovered, seed.intake);

      await this.completeTask(searchTask.id, "후보군을 추렸습니다.", `${discovered.length}개 후보 선정`);
      await this.completeTask(trendTask.id, "트렌드 신호를 정리했습니다.", "글로벌 인기/숨은 기회 라벨을 계산했습니다.");
      await this.markStage(runId, "discovery", "completed");
      await this.markStage(runId, "trend_enrichment", "completed");

      await this.beginInteractiveStage(runId, "evaluation");
      const evaluationTask = await this.startTask(
        runId,
        "evaluation",
        "evaluation",
        "한국 마켓 핏 평가",
        "후보별 점수와 설명 가능한 근거를 생성합니다."
      );

      const candidates = await this.persistCandidates(runId, seed.intake, discovered, trendSignals);

      await this.completeTask(
        evaluationTask.id,
        "후보 추천과 점수화를 완료했습니다.",
        `${candidates.length}개 후보에 경쟁/마진/리스크 해설을 부여했습니다.`
      );
      await this.markStage(runId, "evaluation", "completed");

      const topCategories = unique(candidates.map((candidate) => candidate.category)).slice(0, 3);

      await this.store.mutate((data) => {
        const run = data.runs.find((item) => item.id === runId);
        if (!run) {
          return;
        }

        run.status = "completed";
        run.currentStage = "evaluation";
        run.stageLabel = "후보 추천과 평가가 준비되었습니다.";
        run.updatedAt = nowIso();
        run.completedAt = nowIso();
        run.candidateIds = candidates.map((candidate) => candidate.id);
        run.candidateCount = candidates.length;
        run.summary = `${candidates.length}개 후보를 추천했습니다. 주요 카테고리: ${topCategories.join(", ")}`;
      });
    } catch (error) {
      console.error("[sourcing] run failed", error);
      await this.failStage(runId, "evaluation", "소싱 런 처리 중 오류가 발생했습니다.");
    }
  }

  private searchAgent(intake: SourcingIntake) {
    const context = this.buildRunSearchContext(intake);
    const ranked = GLOBAL_PRODUCT_CATALOG.map((entry) => ({
      entry,
      score: this.catalogMatchScore(entry, intake, context)
    }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);

    const selected =
      intake.mode === "focus_category"
        ? fillToMinimum(
            ranked.map((item) => item.entry),
            GLOBAL_PRODUCT_CATALOG.filter((entry) => !entry.riskLabels.includes("지재권/IP")),
            8
          )
        : fillToMinimum(
            ranked
              .filter((item) => item.entry.broadDemand || item.entry.track !== "EMERGING")
              .map((item) => item.entry),
            GLOBAL_PRODUCT_CATALOG.filter((entry) => entry.broadDemand),
            8
          );

    return selected.slice(0, 8);
  }

  private trendAgent(entries: CatalogEntry[], intake: SourcingIntake) {
    const interestText = intake.interests.join(", ");

    return Object.fromEntries(
      entries.map((entry) => {
        const opportunityType = pickOpportunityType(entry, intake);
        const evaluationReasons = [
          `${entry.whyHot} (트랙: ${entry.track})`,
          entry.koreanAngle,
          buildPreferenceNote(entry, intake)
        ];

        return [
          entry.canonicalName,
          {
            globalPopularityLabel:
              entry.track === "BURST" ? "숏폼/UGC 급상승" : entry.track === "STEADY" ? "장기 수요 안정형" : "초기 확산형",
            hiddenOpportunityLabel:
              opportunityType === "hidden_gem"
                ? "글로벌 신호 대비 한국 경쟁이 약한 편"
                : opportunityType === "focus_match"
                  ? `${interestText || entry.category} 적합도 높음`
                  : "대중 수요가 분명한 검증형",
            evaluationReasons
          } satisfies TrendSignal
        ];
      })
    ) as Record<string, TrendSignal>;
  }

  private async persistCandidates(
    runId: string,
    intake: SourcingIntake,
    entries: CatalogEntry[],
    trendSignals: Record<string, TrendSignal>
  ) {
    const candidates = entries.map((entry) => {
      const candidateId = randomUUID();
      const scores = this.adjustScores(entry, intake);
      const opportunityType = pickOpportunityType(entry, intake);
      const trendSignal = trendSignals[entry.canonicalName];
      const initialReport = this.buildCompetitionReportFromScores(entry, scores, {
        source: "estimate",
        keyword: entry.localizedName
      });
      const estimatedMarginPercent = clamp(
        Math.round(intake.targetMarginPercent + (scores.sourcingEaseScore - 10) * 0.8 - (entry.riskLevel === "high" ? 7 : 0)),
        12,
        68
      );

      return {
        id: candidateId,
        runId,
        canonicalName: entry.canonicalName,
        localizedName: entry.localizedName,
        category: entry.category,
        track: entry.track,
        whyHot: entry.whyHot,
        targetCustomer: entry.targetCustomer,
        koreanAngle: entry.koreanAngle,
        riskLevel: entry.riskLevel,
        riskLabels: entry.riskLabels,
        scores,
        evidenceCount: entry.evidenceSeeds.length,
        opportunityType,
        opportunityTitle:
          opportunityType === "global_popular"
            ? "전세계 인기 제품"
            : opportunityType === "hidden_gem"
              ? "잘 팔리지만 덜 알려진 기회 제품"
              : "관심 분야 적합 제품",
        globalPopularityLabel: trendSignal.globalPopularityLabel,
        hiddenOpportunityLabel: trendSignal.hiddenOpportunityLabel,
        koreaCompetitionLabel: competitionLevelLabel(initialReport.competitionLevel),
        estimatedMarginPercent,
        evaluationReasons: [...trendSignal.evaluationReasons, buildCompetitionReason(initialReport)].slice(0, 4),
        competitionStatus: initialReport.status,
        supplierStatus: entry.riskLevel === "high" ? "blocked" : "not_started",
        whoShouldSell: entry.whoShouldSell,
        notes: entry.notes,
        recommendedActions: buildRecommendedActions(entry, initialReport, intake),
        evidence: entry.evidenceSeeds.map((seed) => ({
          id: randomUUID(),
          sourceName: seed.sourceName,
          sourceType: seed.sourceType,
          sourceUrl: seed.sourceUrl,
          summary: seed.summary,
          metricLabel: seed.metricLabel,
          metricValue: seed.metricValue,
          confidence: seed.confidence,
          capturedAt: nowIso()
        })),
        supplierSearchLinks: buildSupplierSearchLinks(entry.canonicalName),
        competitionReport: {
          ...initialReport,
          candidateId
        },
        supplierLeads: [],
        negotiationThreads: []
      } satisfies ProductCandidate;
    });

    await this.store.mutate((data) => {
      data.candidates = data.candidates.filter((candidate) => candidate.runId !== runId);
      data.candidates.push(...candidates);
    });

    return candidates;
  }

  private adjustScores(entry: CatalogEntry, intake: SourcingIntake): ScoreBreakdown {
    let demandScore = entry.demandScore;
    let trendScore = entry.trendScore;
    let koreaFitScore = entry.koreaFitScore;
    let sourcingEaseScore = entry.sourcingEaseScore;
    let riskAdjustedScore = entry.riskAdjustedScore;

    if (intake.shippingSensitivity === "high" && entry.shippingSensitivity === "high") {
      koreaFitScore = Math.max(8, koreaFitScore - 4);
      sourcingEaseScore = Math.max(5, sourcingEaseScore - 3);
    }

    if (intake.regulationSensitivity === "high" && entry.regulationSensitivity === "high") {
      riskAdjustedScore = Math.max(0, riskAdjustedScore - 4);
      koreaFitScore = Math.max(8, koreaFitScore - 3);
    }

    if (
      intake.sourcingCountries.length > 0 &&
      intersectionSize(intake.sourcingCountries, entry.preferredSourcingCountries) === 0
    ) {
      sourcingEaseScore = Math.max(4, sourcingEaseScore - 2);
    }

    if (intake.mode === "focus_category") {
      demandScore = Math.min(30, demandScore + 1);
      trendScore = Math.min(20, trendScore + 1);
    }

    const overallScore = clamp(
      demandScore + trendScore + koreaFitScore + sourcingEaseScore + riskAdjustedScore,
      0,
      100
    );

    return {
      demandScore: Math.min(SOURCING_SCORE_WEIGHTS.demand, demandScore),
      trendScore: Math.min(SOURCING_SCORE_WEIGHTS.trend, trendScore),
      koreaFitScore: Math.min(SOURCING_SCORE_WEIGHTS.koreaFit, koreaFitScore),
      sourcingEaseScore: Math.min(SOURCING_SCORE_WEIGHTS.sourcingEase, sourcingEaseScore),
      riskAdjustedScore: Math.min(SOURCING_SCORE_WEIGHTS.riskAdjusted, riskAdjustedScore),
      overallScore
    };
  }

  private buildCompetitionReport(
    candidate: ProductCandidate,
    options: {
      source: CompetitionReport["source"];
      manualSignal?: string;
      requestedUrl?: string;
    }
  ) {
    return {
      ...this.buildCompetitionReportFromScores(
      {
        canonicalName: candidate.canonicalName,
        localizedName: candidate.localizedName,
        category: candidate.category
      } as CatalogEntry,
      candidate.scores,
      {
        source: options.source,
        keyword: candidate.localizedName,
        manualSignal: options.manualSignal,
        requestedUrl: options.requestedUrl,
        riskLevel: candidate.riskLevel
      }
      ),
      candidateId: candidate.id
    };
  }

  private buildCompetitionReportFromScores(
    entry: Pick<CatalogEntry, "canonicalName" | "localizedName" | "category">,
    scores: ScoreBreakdown,
    options: {
      source: CompetitionReport["source"];
      keyword: string;
      manualSignal?: string;
      requestedUrl?: string;
      riskLevel?: RiskLevel;
    }
  ): CompetitionReport {
    const base = scores.overallScore;
    const competitionLevel = base >= 79 ? "high" : base >= 63 ? "medium" : "low";
    const median = roundToHundred(8900 + base * 470);
    const confidenceBoost = options.manualSignal ? 0.09 : options.source === "estimate" ? 0 : 0.07;
    const confidence = clamp(Number((0.67 + base / 250 + confidenceBoost).toFixed(2)), 0.62, 0.93);
    const manualHint = options.manualSignal ? "스냅샷 텍스트가 함께 반영되었습니다." : undefined;

    return {
      id: randomUUID(),
      candidateId: "",
      status: "ready",
      source: options.source,
      keyword: options.keyword,
      priceMinKrw: roundToHundred(Math.max(3900, median - 4800)),
      priceMedianKrw: median,
      priceMaxKrw: roundToHundred(median + 6200),
      sellerDensity: competitionLevel === "high" ? "높음" : competitionLevel === "medium" ? "중간" : "낮음",
      reviewDensity: base >= 82 ? "후기 축적 빠름" : base >= 68 ? "후기 축적 보통" : "후기 축적 초기",
      searchInterest: base >= 78 ? "검색량 우상향" : base >= 65 ? "안정적 수요" : "니치 수요",
      competitionLevel,
      competitionSummary:
        competitionLevel === "high"
          ? "국내 경쟁 제품이 이미 존재할 가능성이 높아 번들, 패키지, 메시지 차별화가 필요합니다."
          : competitionLevel === "medium"
            ? "경쟁은 있지만 구성/브랜딩 차별화 여지가 있습니다."
            : "국내 경쟁 밀도가 낮아 빠른 테스트 진입에 유리합니다.",
      insightSummary: [manualHint, `${entry.localizedName} / ${entry.category} 기준으로 경쟁 강도를 계산했습니다.`]
        .filter(Boolean)
        .join(" "),
      riskSummary:
        options.riskLevel === "high"
          ? "규제 또는 IP 리스크를 먼저 검토해야 합니다."
          : "현 단계에서는 판매 운영 리스크가 통제 가능한 수준으로 보입니다.",
      differentiationIdeas: [
        "세트 구성 또는 번들링으로 비교가격 프레임을 바꾸기",
        "사용 장면 중심 콘텐츠로 구매 이유를 선명하게 만들기",
        "한국형 상세페이지/패키징 메시지로 로컬라이징하기"
      ],
      confidence,
      collectedAt: nowIso()
    };
  }

  private async fetchNaverCompetitionReport(
    candidate: ProductCandidate,
    options: {
      pageSnapshotText?: string;
      reviewSnapshotText?: string;
    }
  ) {
    const clientId = normalizeWhitespace(process.env.NAVER_SEARCH_CLIENT_ID);
    const clientSecret = normalizeWhitespace(process.env.NAVER_SEARCH_CLIENT_SECRET);

    if (!clientId || !clientSecret) {
      return null;
    }

    const url = new URL("https://openapi.naver.com/v1/search/shop.json");
    url.searchParams.set("query", candidate.localizedName);
    url.searchParams.set("display", "10");
    url.searchParams.set("sort", "sim");

    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as NaverSearchResponse;
    const prices = payload.items
      .flatMap((item) => [Number(item.lprice), Number(item.hprice)])
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right);

    if (prices.length === 0) {
      return null;
    }

    const malls = unique(payload.items.map((item) => normalizeWhitespace(item.mallName)).filter(Boolean));
    const min = prices[0];
    const max = prices[prices.length - 1];
    const median = prices[Math.floor(prices.length / 2)];
    const competitionLevel = payload.total > 1500 ? "high" : payload.total > 300 ? "medium" : "low";
    const snapshotBoost = options.pageSnapshotText || options.reviewSnapshotText ? 0.06 : 0;

    return {
      id: randomUUID(),
      candidateId: candidate.id,
      status: "ready",
      source: "naver_api",
      keyword: candidate.localizedName,
      priceMinKrw: min,
      priceMedianKrw: median,
      priceMaxKrw: max,
      sellerDensity: payload.total > 1000 ? "높음" : payload.total > 300 ? "중간" : "낮음",
      reviewDensity: payload.total > 1000 ? "후기 축적 빠름" : payload.total > 250 ? "후기 축적 보통" : "후기 축적 초기",
      searchInterest: payload.total > 1000 ? "검색량 우상향" : payload.total > 300 ? "안정적 수요" : "니치 수요",
      competitionLevel,
      competitionSummary:
        competitionLevel === "high"
          ? "네이버 쇼핑 검색 결과 기준 경쟁이 강합니다. 차별화된 구성과 상세페이지 전략이 필요합니다."
          : competitionLevel === "medium"
            ? "경쟁은 있지만 가격/구성/브랜딩 차별화 여지가 보입니다."
            : "검색 결과 밀도가 낮아 초기 테스트 진입 여지가 있습니다.",
      insightSummary: `${payload.total.toLocaleString()}건 검색 결과와 ${malls.length}개 쇼핑몰 노출을 바탕으로 계산했습니다.`,
      riskSummary:
        candidate.riskLevel === "high"
          ? "규제 또는 IP 이슈를 먼저 확인해야 합니다."
          : "검색 기준으로는 즉시 테스트 가능한 수준의 경쟁 강도입니다.",
      differentiationIdeas: [
        "상세페이지에서 사용 장면과 전후 효과를 더 선명하게 보여주기",
        "저가 경쟁 대신 번들/사은품 구성으로 객단가를 방어하기",
        "한국 고객 리뷰 표현을 미리 설계해 재구매 포인트를 만들기"
      ],
      confidence: clamp(Number((0.82 + snapshotBoost).toFixed(2)), 0.82, 0.91),
      collectedAt: nowIso()
    } satisfies CompetitionReport;
  }

  private buildSupplierLeads(candidate: ProductCandidate): SupplierLead[] {
    const basePrice = Math.max(1.4, candidate.scores.overallScore / 18);
    const supplierCountries = candidate.track === "STEADY" ? ["CN", "VN", "CN"] : ["CN", "CN", "VN"];

    return buildSupplierSearchLinks(candidate.canonicalName).map((searchLink, index) => ({
      id: randomUUID(),
      candidateId: candidate.id,
      sourceSite: searchLink.label as SupplierLead["sourceSite"],
      supplierName:
        index === 0
          ? `${candidate.localizedName} Verified Factory`
          : `${candidate.localizedName} OEM Partner ${index}`,
      supplierCountry: supplierCountries[index] ?? "CN",
      moq: `${200 + index * 100} units`,
      unitPriceRange: `$${basePrice.toFixed(2)}-$${(basePrice + 1.35 + index * 0.5).toFixed(2)}`,
      leadTime: `${12 + index * 3}-${18 + index * 5} days`,
      confidence: clamp(Number((0.8 - index * 0.08).toFixed(2)), 0.54, 0.82),
      contactNote:
        index === 0
          ? "샘플 확보와 첫 견적 비교를 시작하기 좋은 우선 후보"
          : "MOQ와 단가 조건 비교를 위한 서브 후보",
      riskLevel: candidate.riskLevel,
      searchUrl: searchLink.url,
      sampleAvailable: index < 2,
      oemAvailable: index !== 2,
      capabilitySummary:
        index === 0
          ? "샘플, 로고 인쇄, 맞춤 패키징 문의에 적합"
          : "가격 비교와 MOQ 협상용으로 활용 가능",
      contactEmail: `sales${index + 1}@${slugifySupplierDomain(candidate.canonicalName)}.example.com`
    }));
  }

  private buildRunSearchContext(intake: SourcingIntake): RunSearchContext {
    return {
      interestTokens: tokenize(`${intake.interests.join(" ")} ${intake.notes ?? ""}`),
      excludedTokens: tokenize(intake.excludedCategories.join(" "))
    };
  }

  private catalogMatchScore(entry: CatalogEntry, intake: SourcingIntake, context: RunSearchContext) {
    const haystack = tokenize(`${entry.category} ${entry.tags.join(" ")} ${entry.whyHot} ${entry.localizedName}`);

    if (context.excludedTokens.some((token) => haystack.includes(token))) {
      return 0;
    }

    let score = 1;

    if (intake.mode === "explore_anything" && entry.broadDemand) {
      score += 3;
    }

    score += context.interestTokens.filter((token) => haystack.includes(token)).length * 4;

    if (intersectionSize(intake.sourcingCountries, entry.preferredSourcingCountries) > 0) {
      score += 1;
    }

    if (intake.regulationSensitivity === "high" && entry.riskLevel === "high") {
      score -= 3;
    }

    if (intake.shippingSensitivity === "high" && entry.shippingSensitivity === "high") {
      score -= 2;
    }

    if (intake.targetMarginPercent >= 40 && entry.sourcingEaseScore >= 12) {
      score += 1;
    }

    if (!entry.broadDemand && entry.riskLevel === "low") {
      score += 1;
    }

    return score;
  }

  private async getMailboxConnection() {
    return this.store.mutate((data) => {
      const existing = data.mailboxConnections.find(
        (connection) => connection.userId === DEFAULT_USER_ID && connection.provider === "google"
      );

      if (existing) {
        return structuredClone(existing);
      }

      const created: MailboxConnection = {
        id: randomUUID(),
        userId: DEFAULT_USER_ID,
        provider: "google",
        status: "not_connected",
        scope: [],
        isMock: true
      };

      data.mailboxConnections.push(created);
      return structuredClone(created);
    });
  }

  private async buildRunDetailById(runId: string) {
    return this.store.read((data) => {
      const run = data.runs.find((item) => item.id === runId);

      if (!run) {
        return null;
      }

      return buildRunDetail(run, data.candidates, data.tasks, data.mailboxConnections);
    });
  }

  private async beginInteractiveStage(runId: string, stage: SourcingRunStage) {
    await this.store.mutate((data) => {
      const run = data.runs.find((item) => item.id === runId);
      if (!run) {
        return;
      }

      run.status = "running";
      run.currentStage = stage;
      run.stageLabel = `${SOURCING_STAGE_LABELS[stage]} 중`;
      run.updatedAt = nowIso();

      run.stages = run.stages.map((snapshot) =>
        snapshot.stage === stage
          ? {
              ...snapshot,
              status: "active",
              updatedAt: nowIso()
            }
          : snapshot
      );
    });
  }

  private async completeInteractiveStage(runId: string, stage: SourcingRunStage, stageLabel: string) {
    await this.store.mutate((data) => {
      const run = data.runs.find((item) => item.id === runId);
      if (!run) {
        return;
      }

      run.status = "completed";
      run.currentStage = stage;
      run.stageLabel = stageLabel;
      run.updatedAt = nowIso();

      run.stages = run.stages.map((snapshot) =>
        snapshot.stage === stage
          ? {
              ...snapshot,
              status: "completed",
              updatedAt: nowIso()
            }
          : snapshot
      );
    });
  }

  private async markStage(runId: string, stage: SourcingRunStage, status: RunStageSnapshot["status"]) {
    await this.store.mutate((data) => {
      const run = data.runs.find((item) => item.id === runId);
      if (!run) {
        return;
      }

      run.stages = run.stages.map((snapshot) =>
        snapshot.stage === stage
          ? {
              ...snapshot,
              status,
              updatedAt: nowIso()
            }
          : snapshot
      );
      run.updatedAt = nowIso();
    });
  }

  private async failStage(runId: string, stage: SourcingRunStage, message: string) {
    await this.store.mutate((data) => {
      const run = data.runs.find((item) => item.id === runId);
      if (!run) {
        return;
      }

      run.status = "failed";
      run.currentStage = stage;
      run.stageLabel = message;
      run.updatedAt = nowIso();

      run.stages = run.stages.map((snapshot) =>
        snapshot.stage === stage
          ? {
              ...snapshot,
              status: "failed",
              updatedAt: nowIso()
            }
          : snapshot
      );
    });
  }

  private async startTask(
    runId: string,
    stage: SourcingRunStage,
    agent: AgentKind,
    title: string,
    inputSummary?: string
  ) {
    const task: AgentTask = {
      id: randomUUID(),
      runId,
      stage,
      agent,
      status: "running",
      title,
      summary: `${title} 시작`,
      inputSummary,
      retries: 0,
      startedAt: nowIso()
    };

    await this.store.mutate((data) => {
      data.tasks.push(task);
    });

    return task;
  }

  private async completeTask(taskId: string, summary: string, outputSummary?: string) {
    await this.store.mutate((data) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      task.status = "completed";
      task.summary = summary;
      task.outputSummary = outputSummary;
      task.completedAt = nowIso();
    });
  }

  private async blockTask(taskId: string, summary: string) {
    await this.store.mutate((data) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      task.status = "blocked";
      task.summary = summary;
      task.completedAt = nowIso();
    });
  }

  private async failTask(taskId: string, errorMessage: string) {
    await this.store.mutate((data) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      task.status = "failed";
      task.summary = "작업 실패";
      task.errorMessage = errorMessage;
      task.completedAt = nowIso();
    });
  }

  private hasNaverCredentials() {
    return Boolean(
      normalizeWhitespace(process.env.NAVER_SEARCH_CLIENT_ID) &&
        normalizeWhitespace(process.env.NAVER_SEARCH_CLIENT_SECRET)
    );
  }
}

function buildRunDetail(
  run: DiscoveryRun,
  candidates: ProductCandidate[],
  tasks: AgentTask[],
  mailboxConnections: MailboxConnection[]
): DiscoveryRunDetail {
  const runCandidates = candidates
    .filter((candidate) => candidate.runId === run.id)
    .sort((left, right) => right.scores.overallScore - left.scores.overallScore);
  const mailbox = mailboxConnections.find(
    (connection) => connection.userId === run.userId && connection.provider === "google"
  );

  return {
    ...run,
    candidateIds: runCandidates.map((candidate) => candidate.id),
    candidateCount: runCandidates.length,
    candidates: runCandidates.map(toCandidateSummary),
    tasks: tasks.filter((task) => task.runId === run.id).sort(sortTasks),
    mailboxConnectionStatus: mailbox?.status ?? "not_connected",
    readyForNegotiation:
      (mailbox?.status ?? "not_connected") === "connected" &&
      runCandidates.some((candidate) => (candidate.supplierLeads ?? []).length > 0)
  };
}

function buildAdminMetrics(
  runs: DiscoveryRun[],
  candidates: ProductCandidate[],
  mailboxConnections: MailboxConnection[],
  reviewQueue: SourcingAdminReviewItem[]
): SourcingAdminMetric[] {
  const activeRuns = runs.filter((run) => run.status === "queued" || run.status === "running").length;
  const readyCandidates = candidates.filter((candidate) => candidate.supplierStatus === "ready").length;
  const connectedMailboxes = mailboxConnections.filter((connection) => connection.status === "connected").length;
  const pendingApprovals = reviewQueue.filter((item) => item.kind === "approval_pending").length;
  const manualReviews = reviewQueue.filter((item) => item.kind === "manual_competition").length;
  const riskBlocked = reviewQueue.filter((item) => item.kind === "supplier_blocked").length;

  return [
    {
      id: "runs",
      label: "진행 중 런",
      value: `${activeRuns}건`,
      hint: `${runs.length}개 런 중 현재 실행 또는 대기 상태`,
      tone: activeRuns > 0 ? "progress" : "stable"
    },
    {
      id: "ready-candidates",
      label: "소싱 준비 후보",
      value: `${readyCandidates}개`,
      hint: "공급처 후보까지 확보된 상품 후보",
      tone: readyCandidates > 0 ? "progress" : "stable"
    },
    {
      id: "approvals",
      label: "승인 대기",
      value: `${pendingApprovals}건`,
      hint: "사용자 승인 후 메일 발송 가능한 초안",
      tone: pendingApprovals > 0 ? "attention" : "stable"
    },
    {
      id: "manual",
      label: "수동 보강 필요",
      value: `${manualReviews}건`,
      hint: "경쟁 분석 스냅샷 또는 URL 보강이 필요한 후보",
      tone: manualReviews > 0 ? "attention" : "stable"
    },
    {
      id: "blocked",
      label: "리스크 차단",
      value: `${riskBlocked}건`,
      hint: "자동 공급처 추천이 차단된 고위험 후보",
      tone: riskBlocked > 0 ? "attention" : "stable"
    },
    {
      id: "mailboxes",
      label: "연결된 메일함",
      value: `${connectedMailboxes}개`,
      hint: "실제 발송 가능한 Gmail 연결 수",
      tone: connectedMailboxes > 0 ? "progress" : "stable"
    }
  ];
}

function buildAdminReviewQueue(
  runs: DiscoveryRun[],
  intakes: SourcingIntake[],
  candidates: ProductCandidate[],
  mailboxConnections: MailboxConnection[]
): SourcingAdminReviewItem[] {
  const runsById = new Map(runs.map((run) => [run.id, run]));
  const intakesById = new Map(intakes.map((intake) => [intake.id, intake]));
  const mailboxByUserId = new Map(
    mailboxConnections
      .filter((connection) => connection.provider === "google")
      .map((connection) => [connection.userId, connection] satisfies [string, MailboxConnection])
  );

  const items = candidates.flatMap((candidate) => {
    const run = runsById.get(candidate.runId);

    if (!run) {
      return [];
    }

    const intake = intakesById.get(run.intakeId);
    const mailbox = mailboxByUserId.get(run.userId);
    const subtitle = `${candidate.localizedName} · ${candidate.category} · ${summarizeIntake(intake)}`;
    const reviewItems: SourcingAdminReviewItem[] = [];

    if (candidate.competitionStatus === "needs_input") {
      reviewItems.push({
        id: `manual-${candidate.id}`,
        kind: "manual_competition",
        priority: "medium",
        title: `${candidate.localizedName} 경쟁 리포트 보강 필요`,
        subtitle,
        detail: "국내 마켓 자동 수집이 제한되었거나 스냅샷 텍스트가 부족합니다. 운영자가 URL 또는 페이지/리뷰 텍스트를 보강해야 합니다.",
        actionLabel: "스냅샷 보강",
        runId: run.id,
        candidateId: candidate.id,
        createdAt: run.createdAt,
        updatedAt: candidate.competitionReport?.collectedAt ?? run.updatedAt
      });
    }

    if (candidate.supplierStatus === "blocked") {
      reviewItems.push({
        id: `blocked-${candidate.id}`,
        kind: "supplier_blocked",
        priority: "high",
        title: `${candidate.localizedName} 자동 소싱 차단`,
        subtitle,
        detail:
          candidate.riskLabels.length > 0
            ? `차단 사유: ${candidate.riskLabels.join(", ")}`
            : "고위험 상품으로 분류되어 운영자 수동 검토가 필요합니다.",
        actionLabel: "리스크 검토",
        runId: run.id,
        candidateId: candidate.id,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt
      });
    }

    (candidate.negotiationThreads ?? []).forEach((thread) => {
      const supplier = (candidate.supplierLeads ?? []).find((lead) => lead.id === thread.supplierLeadId);
      const threadSubtitle = `${candidate.localizedName} · ${supplier?.supplierName ?? "공급처"} · ${summarizeIntake(intake)}`;

      if (thread.pendingApproval?.status === "pending") {
        reviewItems.push({
          id: `approval-${thread.id}`,
          kind: "approval_pending",
          priority: "high",
          title: `${candidate.localizedName} 문의 메일 승인 대기`,
          subtitle: threadSubtitle,
          detail: thread.latestDraft?.subject ?? "최신 문의 초안을 확인하고 승인 발송 여부를 결정해 주세요.",
          actionLabel: "승인 검토",
          runId: run.id,
          candidateId: candidate.id,
          threadId: thread.id,
          supplierLeadId: thread.supplierLeadId,
          createdAt: thread.pendingApproval.createdAt,
          updatedAt: thread.updatedAt
        });
        return;
      }

      if (thread.latestDraft && mailbox?.status !== "connected") {
        reviewItems.push({
          id: `mailbox-${thread.id}`,
          kind: "mailbox_setup",
          priority: "medium",
          title: `${candidate.localizedName} 메일함 연결 필요`,
          subtitle: threadSubtitle,
          detail: "문의 초안은 준비됐지만 발송 가능한 Gmail 연결이 없습니다. 운영자가 OAuth 또는 데모 메일함 연결 상태를 확인해야 합니다.",
          actionLabel: "메일함 연결",
          runId: run.id,
          candidateId: candidate.id,
          threadId: thread.id,
          supplierLeadId: thread.supplierLeadId,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt
        });
      }
    });

    return reviewItems;
  });

  return items.sort(sortAdminReviewItems);
}

function buildAdminRunSummaries(
  runs: DiscoveryRun[],
  intakes: SourcingIntake[],
  candidates: ProductCandidate[],
  mailboxConnections: MailboxConnection[],
  reviewQueue: SourcingAdminReviewItem[]
): SourcingAdminRunSummary[] {
  const intakesById = new Map(intakes.map((intake) => [intake.id, intake]));
  const mailboxByUserId = new Map(
    mailboxConnections
      .filter((connection) => connection.provider === "google")
      .map((connection) => [connection.userId, connection] satisfies [string, MailboxConnection])
  );

  return [...runs]
    .sort((left, right) => toEpoch(right.updatedAt) - toEpoch(left.updatedAt))
    .slice(0, 12)
    .map((run) => {
      const runCandidates = candidates
        .filter((candidate) => candidate.runId === run.id)
        .sort((left, right) => right.scores.overallScore - left.scores.overallScore);
      const intake = intakesById.get(run.intakeId);
      const mailbox = mailboxByUserId.get(run.userId);

      return {
        id: run.id,
        intakeId: run.intakeId,
        intakeMode: intake?.mode ?? "explore_anything",
        interestSummary: summarizeIntake(intake),
        status: run.status,
        currentStage: run.currentStage,
        stageLabel: run.stageLabel,
        candidateCount: runCandidates.length,
        topCandidateName: runCandidates[0]?.localizedName,
        topCandidateScore: runCandidates[0]?.scores.overallScore,
        mailboxConnectionStatus: mailbox?.status ?? "not_connected",
        openReviewItems: reviewQueue.filter((item) => item.runId === run.id).length,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt
      };
    });
}

function summarizeIntake(intake?: SourcingIntake) {
  if (!intake) {
    return "인테이크 정보 없음";
  }

  if (intake.mode === "focus_category" && intake.interests.length > 0) {
    return `관심 분야: ${intake.interests.slice(0, 3).join(", ")}`;
  }

  if (intake.excludedCategories.length > 0) {
    return `광범위 탐색 · 제외 ${intake.excludedCategories.slice(0, 2).join(", ")}`;
  }

  return "광범위 탐색";
}

function sortAdminReviewItems(left: SourcingAdminReviewItem, right: SourcingAdminReviewItem) {
  const priorityGap = priorityRank(right.priority) - priorityRank(left.priority);
  if (priorityGap !== 0) {
    return priorityGap;
  }

  return toEpoch(right.updatedAt) - toEpoch(left.updatedAt);
}

function priorityRank(priority: SourcingAdminReviewItem["priority"]) {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

function toEpoch(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function toCandidateSummary(candidate: ProductCandidate): ProductCandidateSummary {
  return {
    id: candidate.id,
    runId: candidate.runId,
    canonicalName: candidate.canonicalName,
    localizedName: candidate.localizedName,
    category: candidate.category,
    track: candidate.track,
    whyHot: candidate.whyHot,
    targetCustomer: candidate.targetCustomer,
    koreanAngle: candidate.koreanAngle,
    riskLevel: candidate.riskLevel,
    riskLabels: candidate.riskLabels,
    scores: candidate.scores,
    evidenceCount: candidate.evidence.length,
    opportunityType: candidate.opportunityType,
    opportunityTitle: candidate.opportunityTitle,
    globalPopularityLabel: candidate.globalPopularityLabel,
    hiddenOpportunityLabel: candidate.hiddenOpportunityLabel,
    koreaCompetitionLabel: candidate.koreaCompetitionLabel,
    estimatedMarginPercent: candidate.estimatedMarginPercent,
    evaluationReasons: candidate.evaluationReasons,
    competitionStatus: candidate.competitionStatus,
    supplierStatus: candidate.supplierStatus
  };
}

function buildInitialStages() {
  return SOURCING_STAGE_ORDER.map((stage) => ({
    stage,
    label: SOURCING_STAGE_LABELS[stage],
    status: stage === "intake" ? "active" : "pending",
    updatedAt: nowIso()
  })) satisfies RunStageSnapshot[];
}

function buildSupplierSearchLinks(productName: string): SupplierSearchLink[] {
  const query = encodeURIComponent(productName);

  return [
    {
      label: "Alibaba",
      url: `https://www.alibaba.com/trade/search?SearchText=${query}`
    },
    {
      label: "1688",
      url: `https://s.1688.com/selloffer/offer_search.htm?keywords=${query}`
    },
    {
      label: "Global Sources",
      url: `https://www.globalsources.com/search-results/${query}`
    }
  ];
}

function buildPreferenceNote(entry: CatalogEntry, intake: SourcingIntake) {
  const countryFit =
    intersectionSize(intake.sourcingCountries, entry.preferredSourcingCountries) > 0
      ? "희망 소싱 국가와 정합성이 있습니다."
      : "희망 소싱 국가와 완전히 일치하지는 않지만 대체 공급망 검토가 가능합니다.";

  return `${countryFit} 목표 마진 ${intake.targetMarginPercent}% 기준으로 1차 검토한 후보입니다.`;
}

function buildRecommendedActions(entry: CatalogEntry, report: CompetitionReport, intake: SourcingIntake) {
  return [
    report.competitionLevel === "high"
      ? "패키지/구성 차별화 포인트를 먼저 설계하기"
      : "네이버 경쟁 상품 가격대를 기준으로 첫 테스트 가격을 잡기",
    `Alibaba 우선으로 MOQ ${Math.max(200, intake.targetMarginPercent * 5)} 이하 공급처를 3곳 비교하기`,
    entry.riskLevel === "high" ? "규제/IP 리스크를 먼저 검토하기" : "샘플 확보 후 상세페이지 콘셉트를 빠르게 테스트하기"
  ];
}

function pickOpportunityType(entry: CatalogEntry, intake: SourcingIntake): OpportunityType {
  if (intake.mode === "focus_category" && intake.interests.length > 0) {
    return "focus_match";
  }

  if (!entry.broadDemand && entry.riskLevel !== "high") {
    return "hidden_gem";
  }

  return "global_popular";
}

function buildCompetitionReason(report: CompetitionReport) {
  if (report.competitionLevel === "high") {
    return "국내 경쟁이 강해 가격보다 구성 차별화가 중요합니다.";
  }

  if (report.competitionLevel === "medium") {
    return "국내 경쟁은 있지만 브랜딩 차별화 여지가 있습니다.";
  }

  return "국내 경쟁 밀도가 낮아 초기 테스트 진입에 유리합니다.";
}

function refreshEvaluationReasons(candidate: ProductCandidate, report: CompetitionReport) {
  const baseReasons = [
    candidate.whyHot,
    candidate.koreanAngle,
    buildCompetitionReason(report),
    candidate.riskLabels.length ? `주의 리스크: ${candidate.riskLabels.join(", ")}` : "리스크가 상대적으로 낮습니다."
  ];

  return unique(baseReasons).slice(0, 4);
}

function buildGuardrails(supplierLead: SupplierLead, overrides?: Partial<NegotiationGuardrails>): NegotiationGuardrails {
  const quoteRange = supplierLead.unitPriceRange.replace(/\$/g, "").split("-");
  const targetUnitPriceUsd = Number(quoteRange[0]) || 3.5;

  return {
    targetUnitPriceUsd: clampNumber(overrides?.targetUnitPriceUsd ?? Number((targetUnitPriceUsd * 0.88).toFixed(2)), 0.8, 100),
    maxMoq: Math.max(100, overrides?.maxMoq ?? (Number.parseInt(supplierLead.moq, 10) || 300)),
    askSample: overrides?.askSample ?? true,
    desiredIncoterm: overrides?.desiredIncoterm ?? "FOB",
    bannedPhrases: overrides?.bannedPhrases ?? [
      "final final offer",
      "we need 50% price cut",
      "guaranteed monthly order"
    ]
  };
}

function createInquiryDraft(candidate: ProductCandidate, supplierLead: SupplierLead, guardrails: NegotiationGuardrails): OutreachDraft {
  return {
    id: randomUUID(),
    candidateId: candidate.id,
    supplierLeadId: supplierLead.id,
    threadId: "",
    subject: `Inquiry for ${candidate.canonicalName} for Korea market`,
    body: [
      `Hello ${supplierLead.supplierName},`,
      "",
      `We are evaluating ${candidate.canonicalName} for the Korea market and would like an initial quotation.`,
      `Our target concept is "${candidate.koreanAngle}" and we are comparing suppliers who can support a reliable first test order.`,
      "",
      "Could you please confirm the following?",
      `1. MOQ options below ${guardrails.maxMoq} units`,
      `2. Unit pricing close to USD ${guardrails.targetUnitPriceUsd.toFixed(2)} for a first order`,
      `3. Sample availability (${guardrails.askSample ? "yes, sample requested" : "sample optional"})`,
      "4. OEM/private label and packaging customization options",
      `5. Lead time and your preferred trade terms (we prefer ${guardrails.desiredIncoterm})`,
      "",
      "If the terms are workable, we are open to starting with a test batch and moving to a larger reorder.",
      "",
      "Best regards,",
      "Han Iroom Sourcing Wizard"
    ].join("\n"),
    checklist: [
      "MOQ와 샘플 비용 확인",
      "OEM/로고 인쇄 가능 여부 확인",
      "첫 발주 리드타임 확인",
      "패키징 커스터마이징 여부 확인",
      "원부자재 또는 인증 문서 확인"
    ],
    createdAt: nowIso(),
    status: "draft"
  };
}

function createReplyDraft(
  candidate: ProductCandidate,
  supplierLead: SupplierLead,
  guardrails: NegotiationGuardrails,
  inboundMessage: NegotiationMessage
): OutreachDraft {
  const extracted = inboundMessage.extractedTerms;
  const negotiationPoints = [
    extracted?.unitPriceRange ? `We reviewed your quoted range (${extracted.unitPriceRange}).` : undefined,
    extracted?.moq ? `We also reviewed the MOQ (${extracted.moq}).` : undefined
  ].filter(Boolean);

  return {
    id: randomUUID(),
    candidateId: candidate.id,
    supplierLeadId: supplierLead.id,
    threadId: inboundMessage.threadId,
    subject: `Re: ${candidate.canonicalName} inquiry`,
    body: [
      `Hello ${supplierLead.supplierName},`,
      "",
      ...negotiationPoints,
      `For our Korea-market test order, we would like to target around USD ${guardrails.targetUnitPriceUsd.toFixed(2)} and MOQ up to ${guardrails.maxMoq} units.`,
      guardrails.askSample ? "Please include sample pricing and sample lead time as well." : "Sample is optional for this stage.",
      `If possible, please also confirm packaging options and ${guardrails.desiredIncoterm} terms.`,
      "",
      "If these conditions are workable, we can move forward quickly with a pilot order.",
      "",
      "Best regards,",
      "Han Iroom Sourcing Wizard"
    ].join("\n"),
    checklist: [
      "상대가 제시한 MOQ와 목표 MOQ 차이 확인",
      "단가 조정 여지 확인",
      "샘플/패키징 일정 확인",
      "인코텀즈 재확인"
    ],
    createdAt: nowIso(),
    status: "draft"
  };
}

function createApprovalRequest(input: { threadId: string; draftId: string }): ApprovalRequest {
  return {
    id: randomUUID(),
    threadId: input.threadId,
    draftId: input.draftId,
    status: "pending",
    createdAt: nowIso()
  };
}

function summarizeSupplierReply(body: string) {
  const compact = normalizeWhitespace(body);
  if (!compact) {
    return "공급처 답장이 비어 있습니다.";
  }

  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
}

function extractTermsFromReply(body: string): NegotiationExtractedTerms {
  const compact = normalizeWhitespace(body);
  const moqMatch = compact.match(/(\d{2,5})\s*(pcs|units|pieces)/i);
  const priceMatch = compact.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const leadTimeMatch = compact.match(/(\d{1,2}\s*(?:-|to)\s*\d{1,2}\s*(?:days|day))/i);

  return {
    moq: moqMatch ? moqMatch[0] : undefined,
    unitPriceRange: priceMatch ? `${priceMatch[1]}-${priceMatch[2]}` : undefined,
    leadTime: leadTimeMatch ? leadTimeMatch[0] : undefined,
    sampleAvailable: /sample/i.test(compact) ? /available|yes|can/i.test(compact) : undefined,
    notes: compact
      .split(/[.!?]/)
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean)
      .slice(0, 3)
  };
}

function findCandidateAndLead(candidates: ProductCandidate[], supplierLeadId: string) {
  for (const candidate of candidates) {
    const supplierLead = (candidate.supplierLeads ?? []).find((lead) => lead.id === supplierLeadId);
    if (supplierLead) {
      return {
        candidate,
        supplierLead
      };
    }
  }

  return null;
}

function findThreadById(candidates: ProductCandidate[], threadId: string) {
  for (const candidate of candidates) {
    const thread = (candidate.negotiationThreads ?? []).find((item) => item.id === threadId);
    if (thread) {
      return {
        candidate,
        thread
      };
    }
  }

  return null;
}

function upsertMailboxConnection(
  data: {
    mailboxConnections: MailboxConnection[];
  },
  base: MailboxConnection,
  patch: Partial<MailboxConnection>
) {
  const index = data.mailboxConnections.findIndex((connection) => connection.id === base.id);
  const nextValue = {
    ...base,
    ...patch
  };

  if (index >= 0) {
    data.mailboxConnections[index] = nextValue;
  } else {
    data.mailboxConnections.push(nextValue);
  }

  return nextValue;
}

async function exchangeGoogleCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google 토큰 교환 실패: ${body}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined
  };
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google 프로필 조회 실패: ${body}`);
  }

  return (await response.json()) as {
    email: string;
    name: string;
  };
}

async function sendViaGmail(
  accessToken: string,
  input: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }
) {
  const raw = Buffer.from(
    [`From: ${input.from}`, `To: ${input.to}`, `Subject: ${input.subject}`, "Content-Type: text/plain; charset=utf-8", "", input.body].join(
      "\r\n"
    )
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail 전송 실패: ${body}`);
  }
}

function normalizeWhitespace(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function tokenize(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function intersectionSize(left: string[], right: string[]) {
  const rightTokens = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => rightTokens.has(item.toLowerCase())).length;
}

function fillToMinimum<T extends { canonicalName: string }>(selected: T[], fallback: T[], minimum: number) {
  const seen = new Set(selected.map((item) => item.canonicalName.toLowerCase()));
  const combined = [...selected];

  fallback.forEach((item) => {
    if (combined.length >= minimum) {
      return;
    }

    const key = item.canonicalName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  });

  return combined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundToHundred(value: number) {
  return Math.round(value / 100) * 100;
}

function competitionLevelLabel(level: CompetitionLevel) {
  switch (level) {
    case "high":
      return "한국 경쟁 강함";
    case "medium":
      return "한국 경쟁 보통";
    case "low":
      return "한국 경쟁 낮음";
    default:
      return "경쟁 미확인";
  }
}

function slugifySupplierDomain(productName: string) {
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortTasks(left: AgentTask, right: AgentTask) {
  return new Date(left.startedAt ?? left.completedAt ?? 0).getTime() - new Date(right.startedAt ?? right.completedAt ?? 0).getTime();
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isBlockedSensitiveHost(urlValue: string) {
  try {
    const url = new URL(urlValue);
    return BLOCK_SENSITIVE_HOSTS.some((host) => url.hostname.includes(host));
  } catch {
    return false;
  }
}
