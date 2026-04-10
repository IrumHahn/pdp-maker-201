import type { PdpGenerateImageRequest } from "@runacademy/shared";
import { PdpController } from "../../../../lib/pdp-server/pdp.controller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pdpController = new PdpController();

export async function POST(request: Request) {
  const body = (await request.json()) as PdpGenerateImageRequest;
  const geminiApiKeyOverride = request.headers.get("x-gemini-api-key") ?? undefined;
  const response = await pdpController.generateImage(body, geminiApiKeyOverride);

  return Response.json(response, {
    status: response.ok ? 200 : mapErrorCodeToStatus(response.code)
  });
}

function mapErrorCodeToStatus(code?: string) {
  switch (code) {
    case "INVALID_IMAGE_PAYLOAD":
    case "INVALID_REQUEST":
      return 400;
    case "GEMINI_API_KEY_MISSING":
    case "GEMINI_API_KEY_INVALID":
      return 401;
    case "GEMINI_MODEL_ACCESS_DENIED":
      return 403;
    case "GEMINI_QUOTA_EXCEEDED":
      return 429;
    default:
      return 500;
  }
}
