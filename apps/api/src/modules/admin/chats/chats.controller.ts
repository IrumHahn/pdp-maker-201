import { Controller, Get, Param } from "@nestjs/common";

@Controller("admin/chats")
export class AdminChatsController {
  @Get()
  listChats() {
    return {
      ok: true,
      items: [
        {
          id: "chat_1",
          startedAt: new Date().toISOString(),
          lastMessage: "강의 커리큘럼 문의"
        }
      ]
    };
  }

  @Get(":id")
  getChat(@Param("id") id: string) {
    return {
      ok: true,
      id,
      messages: [
        {
          role: "user",
          content: "초보자도 수강 가능한가요?"
        },
        {
          role: "assistant",
          content: "네, 입문자 가이드를 함께 제공합니다."
        }
      ]
    };
  }
}
