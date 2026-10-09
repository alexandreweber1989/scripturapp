import { NextResponse } from "next/server";
import { InvalidActivityRequest, activityRequestSchema, resolveActivityRequest } from "@/lib/activity-request";
import { loadProgress, recordActivity } from "@/lib/server/progress";
import { getSessionUser } from "@/lib/server/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { state } = await loadProgress(user.id);
  return NextResponse.json({ state });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = activityRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Atividade inválida." }, { status: 400 });

  try {
    const result = await recordActivity(user.id, resolveActivityRequest(parsed.data));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidActivityRequest) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
