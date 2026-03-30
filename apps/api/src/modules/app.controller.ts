import { Controller, Get } from "@nestjs/common";
import { BRAND_PRIMARY, DEFAULT_MODEL } from "../common/constants";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      ok: true,
      service: "@runacademy/api",
      brandPrimary: BRAND_PRIMARY,
      defaultModel: DEFAULT_MODEL
    };
  }
}
