import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildSystemPrompt, CRISIS_KEYWORDS, CRISIS_RESPONSE } from "@/lib/chat-config";
import { getModel, DEFAULT_MODEL_ID, getModelChain } from "@/lib/models";
import { getSessionVisitorId } from "@/lib/auth";
import { streamChatCompletion } from "@/lib/zai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  visitorName?: string;
  modelId?: string;
}

async function enforceDailyLimit(
  visitorId: string,
  modelId: string
): Promise<{ allowed: boolean; used?: number; remaining?: number }> {
  const model = getModel(modelId);
  if (!model) return { allowed: false };
  if (model.tier === "pro") {
    const visitor = await db.visitor.findUnique({
      where: { id: visitorId },
      select: { isPro: true, proExpiresAt: true },
    });
    const isProActive =
      visitor?.isPro && (!visitor?.proExpiresAt || visitor.proExpiresAt > new Date());
    return { allowed: Boolean(isProActive) };
  }
  if (model.dailyLimit === 0) return { allowed: true };

  const today = new Date().toISOString().slice(0, 10);
  const usage = await db.modelUsage.findUnique({
    where: { visitorId_modelId_date: { visitorId, modelId, date: today } },
  });
  const used = usage?.count ?? 0;
  return { allowed: used < model.dailyLimit, used, remaining: Math.max(0, model.dailyLimit - used) };
}

async function recordUsage(visitorId: string, modelId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await db.modelUsage
    .upsert({
      where: { visitorId_modelId_date: { visitorId, modelId, date: today } },
      create: { visitorId, modelId, date: today, count: 1 },
      update: { count: { increment: 1 } },
    })
    .catch(() => {});
}

export async function POST(req: NextRequest) {
  const sessionVisitorId = await getSessionVisitorId(req);
  if (!sessionVisitorId) {
    return NextResponse.json({ error: "Unauthorized. Please sign in or continue as a guest." }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Missing 'messages' array in request body." }, { status: 400 });
  }

  const modelId = body.modelId && getModel(body.modelId) ? body.modelId : DEFAULT_MODEL_ID;

  const limitCheck = await enforceDailyLimit(sessionVisitorId, modelId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "You've reached today's limit on this conversation mode.", lockedReason: "daily-limit" },
      { status: 403 }
    );
  }

  const systemPrompt = buildSystemPrompt(body.visitorName?.trim() || undefined);

  const history = body.messages
    .filter((m) => typeof m?.content === "string" && m.content.trim().length > 0)
    .slice(-6);

  const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
  const lastUserText = (lastUserMsg?.content || "").toLowerCase();

  const inCrisis = CRISIS_KEYWORDS.some((k) => lastUserText.includes(k));

  const encoder = new TextEncoder();

  await recordUsage(sessionVisitorId, modelId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };

      let fullReply = "";

      send({ started: true });

      try {
        if (inCrisis) {
          fullReply = CRISIS_RESPONSE;
          send({ token: fullReply });
        } else {
          const messagesForModel: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...history,
          ];
          for await (const token of streamChatCompletion(messagesForModel, getModelChain(modelId))) {
            fullReply += token;
            send({ token });
          }
        }

        send({ done: true });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          send({ done: true });
        } else {
          console.error("[chat/stream] error:", err);
          const message = err instanceof Error ? err.message : "Unknown error";
          send({ error: message });
          send({ done: true });
        }
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}