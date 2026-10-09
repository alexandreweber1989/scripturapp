import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompanion } from "@/domain/companions";
import { dayKey } from "@/domain/time";
import { MENTOR_BASE_PROMPT, companionPersona } from "@/lib/server/mentor-prompt";
import { recordActivity } from "@/lib/server/progress";
import { getSessionUser } from "@/lib/server/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";

const MODEL = process.env.MENTOR_MODEL || "claude-opus-5-5";
const DAILY_LIMIT = {
  free: Number(process.env.MENTOR_DAILY_LIMIT_FREE ?? 10),
  premium: Number(process.env.MENTOR_DAILY_LIMIT_PREMIUM ?? 100),
};
const HISTORY_LIMIT = 20;

const bodySchema = z.object({
  companionId: z.string().max(32).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(100),
});

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Keeps the most recent turns, starting on a user message as the API requires. */
function trimHistory(messages: Anthropic.Beta.BetaMessageParam[]) {
  const recent = messages.slice(-HISTORY_LIMIT);
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent;
}

export async function POST(request: Request) {
  if (!anthropic) return error(503, "O mentor ainda não foi configurado (ANTHROPIC_API_KEY ausente).");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(400, "Mensagem inválida.");
  const { messages } = parsed.data;
  if (messages.at(-1)?.role !== "user") return error(400, "A última mensagem deve ser sua.");

  // Access control and quota live on the server; the client never decides.
  const user = await getSessionUser();
  let companionId = parsed.data.companionId;
  if (user) {
    const supabase = (await getServerSupabase())!;
    const { data: profile } = await supabase.from("profiles").select("plan, companion_id").eq("id", user.id).single();
    companionId = profile?.companion_id ?? companionId;
    const limit = profile?.plan === "premium" ? DAILY_LIMIT.premium : DAILY_LIMIT.free;
    const { data: allowed, error: quotaError } = await getAdminSupabase().rpc("consume_ai_quota", {
      p_user_id: user.id,
      p_day: dayKey(),
      p_limit: limit,
    });
    if (quotaError) throw quotaError;
    if (!allowed) return error(429, `Você usou suas ${limit} conversas de hoje com o mentor. Volte amanhã!`);
  } else if (isSupabaseConfigured || process.env.ALLOW_GUEST_MENTOR !== "true") {
    return error(401, "Entre na sua conta para conversar com o mentor.");
  }

  const companion = getCompanion(companionId);
  const question = messages.at(-1)!.content;

  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    // Chat answers don't need deep deliberation; low effort keeps replies fast.
    output_config: { effort: "low" },
    system: [
      { type: "text", text: MENTOR_BASE_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: companionPersona(companion) },
    ],
    // Caches the conversation prefix as it grows.
    cache_control: { type: "ephemeral" },
    messages: trimHistory(messages),
    // If a safety classifier declines a benign question, retry on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = "\n\nNão consigo continuar essa resposta. Que tal reformular a pergunta?";
          answer += note;
          controller.enqueue(encoder.encode(note));
        }
        controller.close();
      } catch (e) {
        console.error("mentor stream failed", e);
        controller.enqueue(encoder.encode("\n\n_Tive um problema para responder agora. Tente novamente em instantes._"));
        controller.close();
        return;
      }

      if (user && answer) {
        const admin = getAdminSupabase();
        const { data: saved } = await admin
          .from("mentor_messages")
          .insert([
            { user_id: user.id, role: "user", content: question },
            { user_id: user.id, role: "assistant", content: answer },
          ])
          .select("id");
        const messageId = saved?.[0]?.id;
        if (messageId) await recordActivity(user.id, { type: "mentor_question", messageId });
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
