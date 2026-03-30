import { Body, Controller, Post } from "@nestjs/common";
import { DEFAULT_MODEL } from "../../common/constants";

interface ChatMessageRequest {
  sessionId?: string;
  message: string;
}

interface InquiryRequest {
  name: string;
  email: string;
  message: string;
}

@Controller("chat")
export class ChatController {
  @Post("messages")
  createMessage(@Body() body: ChatMessageRequest) {
    return {
      ok: true,
      provider: "openai",
      model: DEFAULT_MODEL,
      sessionId: body.sessionId ?? "session-scaffold",
      answer:
        "MVP scaffold response: API implementation is connected. Next step is RAG retrieval + provider call.",
      escalateToInquiry: false
    };
  }

  @Post("inquiries")
  createInquiry(@Body() body: InquiryRequest) {
    return {
      ok: true,
      ticketId: `ticket_${Date.now()}`,
      status: "open",
      received: {
        name: body.name,
        email: body.email
      }
    };
  }
}
