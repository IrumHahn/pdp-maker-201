import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SourcingService } from "./sourcing.service";
import type { SourcingIntakeInput } from "./sourcing.types";

interface StartRunRequest {
  intakeId: string;
}

interface LocalMarketRequest {
  url?: string;
  pageSnapshotText?: string;
  reviewSnapshotText?: string;
}

interface GoogleConnectStartRequest {
  redirectUri?: string;
}

interface GoogleConnectCompleteRequest {
  code?: string;
  redirectUri?: string;
  email?: string;
  displayName?: string;
}

interface DraftInquiryRequest {
  guardrails?: {
    targetUnitPriceUsd?: number;
    maxMoq?: number;
    askSample?: boolean;
    desiredIncoterm?: string;
    bannedPhrases?: string[];
  };
}

interface DraftReplyRequest {
  supplierReplyText?: string;
}

@Controller("sourcing")
export class SourcingController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Post("intakes")
  createIntake(@Body() body: SourcingIntakeInput) {
    return this.sourcingService.createIntake(body);
  }

  @Post("runs")
  startRun(@Body() body: StartRunRequest) {
    return this.sourcingService.startRun(body.intakeId);
  }

  @Get("runs/:id")
  getRun(@Param("id") runId: string) {
    return this.sourcingService.getRun(runId);
  }

  @Get("admin/review-board")
  getAdminReviewBoard() {
    return this.sourcingService.getAdminReviewBoard();
  }

  @Get("candidates/:id")
  getCandidate(@Param("id") candidateId: string) {
    return this.sourcingService.getCandidate(candidateId);
  }

  @Post("candidates/:id/local-market")
  collectLocalMarket(@Param("id") candidateId: string, @Body() body: LocalMarketRequest) {
    return this.sourcingService.refreshCompetitionReport(candidateId, body);
  }

  @Post("candidates/:id/suppliers")
  generateSuppliers(@Param("id") candidateId: string) {
    return this.sourcingService.refreshSuppliers(candidateId);
  }

  @Post("candidates/:id/competition-report/refresh")
  refreshCompetitionReport(@Param("id") candidateId: string, @Body() body: LocalMarketRequest) {
    return this.sourcingService.refreshCompetitionReport(candidateId, body);
  }

  @Post("candidates/:id/suppliers/refresh")
  refreshSuppliers(@Param("id") candidateId: string) {
    return this.sourcingService.refreshSuppliers(candidateId);
  }

  @Get("mailboxes/google")
  getGoogleMailbox() {
    return this.sourcingService.getGoogleMailboxConnection();
  }

  @Post("mailboxes/google/connect/start")
  startGoogleConnect(@Body() body: GoogleConnectStartRequest) {
    return this.sourcingService.startGoogleConnect(body);
  }

  @Post("mailboxes/google/connect/complete")
  completeGoogleConnect(@Body() body: GoogleConnectCompleteRequest) {
    return this.sourcingService.completeGoogleConnect(body);
  }

  @Post("negotiations/:id/draft-inquiry")
  createOutreachDraft(@Param("id") supplierLeadId: string, @Body() body: DraftInquiryRequest) {
    return this.sourcingService.draftInquiry(supplierLeadId, body);
  }

  @Post("negotiations/:id/approve-send")
  approveSend(@Param("id") threadId: string) {
    return this.sourcingService.approveSend(threadId);
  }

  @Post("negotiations/:id/draft-reply")
  draftReply(@Param("id") threadId: string, @Body() body: DraftReplyRequest) {
    return this.sourcingService.draftReply(threadId, body);
  }
}
