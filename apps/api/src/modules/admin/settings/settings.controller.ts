import { Body, Controller, Get, Put } from "@nestjs/common";
import { DEFAULT_MODEL } from "../../../common/constants";

interface PromptRequest {
  prompt: string;
}

interface ModelRequest {
  provider: "openai" | "gemini" | "claude";
  model: string;
}

@Controller("admin/settings")
export class AdminSettingsController {
  @Get()
  getSettings() {
    return {
      ok: true,
      model: {
        provider: "openai",
        model: DEFAULT_MODEL
      },
      prompt:
        "당신은 실행학교 상담 챗봇입니다. 근거 기반으로 답변하고 불확실하면 문의 폼을 안내합니다."
    };
  }

  @Put("prompt")
  updatePrompt(@Body() body: PromptRequest) {
    return {
      ok: true,
      prompt: body.prompt
    };
  }

  @Put("model")
  updateModel(@Body() body: ModelRequest) {
    return {
      ok: true,
      model: body
    };
  }
}
