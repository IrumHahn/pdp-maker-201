import { publishCheckIn } from "../../../../lib/hanirum/live-feed";
import { submitCheckIn } from "../../../../lib/hanirum/roster-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CheckInRequestBody {
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckInRequestBody;
    const result = await submitCheckIn(body.name ?? "");

    if (result.status === "success" && result.attendee) {
      publishCheckIn(result.attendee);
    }

    return Response.json(result, {
      status: result.status === "success" || result.status === "already_checked_in" ? 200 : 404,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "체크인 처리 중 오류가 발생했습니다."
      },
      {
        status: 500
      }
    );
  }
}
