import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

interface TicketPatchRequest {
  status: "open" | "in_progress" | "answered";
}

interface TicketReplyRequest {
  subject: string;
  body: string;
}

@Controller("admin/tickets")
export class AdminTicketsController {
  @Get()
  listTickets() {
    return {
      ok: true,
      items: [
        {
          id: "ticket_1",
          status: "open",
          email: "user@example.com",
          message: "환불 정책이 궁금합니다."
        }
      ]
    };
  }

  @Patch(":id")
  updateTicket(@Param("id") id: string, @Body() body: TicketPatchRequest) {
    return {
      ok: true,
      id,
      status: body.status
    };
  }

  @Post(":id/reply")
  replyTicket(@Param("id") id: string, @Body() body: TicketReplyRequest) {
    return {
      ok: true,
      id,
      sent: true,
      subject: body.subject,
      body: body.body
    };
  }
}
