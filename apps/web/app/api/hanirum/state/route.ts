import { getCheckInState } from "../../../../lib/hanirum/roster-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const joinUrl = new URL("/hanirum/join", request.url).toString();
    const state = await getCheckInState(joinUrl);

    return Response.json(state, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "체크인 상태를 불러오지 못했습니다."
      },
      {
        status: 500
      }
    );
  }
}
