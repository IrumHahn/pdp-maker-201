import { Body, Controller, Get, Param, Post } from "@nestjs/common";

interface UrlRequest {
  url: string;
}

interface TextRequest {
  title: string;
  text: string;
}

@Controller("admin/knowledge")
export class AdminKnowledgeController {
  @Get()
  listKnowledge() {
    return {
      ok: true,
      items: [
        {
          id: "ks_1",
          type: "url",
          title: "실행학교 소개",
          status: "indexed"
        }
      ]
    };
  }

  @Post("url")
  addUrl(@Body() body: UrlRequest) {
    return {
      ok: true,
      id: `ks_${Date.now()}`,
      type: "url",
      url: body.url,
      status: "queued"
    };
  }

  @Post("file")
  addFile() {
    return {
      ok: true,
      id: `ks_${Date.now()}`,
      type: "file",
      status: "queued"
    };
  }

  @Post("text")
  addText(@Body() body: TextRequest) {
    return {
      ok: true,
      id: `ks_${Date.now()}`,
      type: "text",
      title: body.title,
      status: "queued"
    };
  }

  @Post(":id/reindex")
  reindex(@Param("id") id: string) {
    return {
      ok: true,
      id,
      status: "queued"
    };
  }
}
