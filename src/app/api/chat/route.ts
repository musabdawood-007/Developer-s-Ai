import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/chat-config";
import { db } from "@/lib/db";
import { getModel, DEFAULT_MODEL_ID, getModelChain } from "@/lib/models";
import {
  streamChatCompletion,
  createVisionChatCompletion,
  generateImage,
} from "@/lib/zai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
}

interface ChatRequestBody {
  messages: ChatMessage[];
  visitorId?: string;
  visitorName?: string;
  sessionId?: string;
  modelId?: string;
}

async function resolveVisitorName(
  visitorId: string | undefined,
  visitorName: string | undefined
): Promise<string | undefined> {
  if (visitorName && visitorName.trim()) return visitorName.trim();
  if (!visitorId) return undefined;
  try {
    const v = await db.visitor.findUnique({
      where: { id: visitorId },
      select: { name: true },
    });
    return v?.name;
  } catch {
    return undefined;
  }
}

/**
 * Check if the visitor can use this model.
 * Returns { allowed, reason, apiModel }.
 */
async function checkModelAccess(
  visitorId: string | undefined,
  modelId: string | undefined
): Promise<{
  allowed: boolean;
  reason?: string;
  apiModel: string;
  modelId: string;
}> {
  const id = modelId || DEFAULT_MODEL_ID;
  const model = getModel(id);

  if (!model) {
    return {
      allowed: false,
      reason: "Unknown model. Please select a valid model.",
      apiModel: "",
      modelId: id,
    };
  }

  // If pro model — check visitor's pro status
  if (model.tier === "pro") {
    if (!visitorId) {
      return {
        allowed: false,
        reason: "Please sign in to access Pro.",
        apiModel: model.apiModel,
        modelId: id,
      };
    }
    const visitor = await db.visitor.findUnique({
      where: { id: visitorId },
      select: { isPro: true, proExpiresAt: true },
    });
    const isProActive =
      visitor?.isPro &&
      (!visitor.proExpiresAt || visitor.proExpiresAt > new Date());
    if (!isProActive) {
      return {
        allowed: false,
        reason:
          "👑 Developer's Pro is a premium tier. Upgrade to unlock unlimited messages.",
        apiModel: model.apiModel,
        modelId: id,
      };
    }
    return { allowed: true, apiModel: model.apiModel, modelId: id };
  }

  // Free model — check daily limit (only if visitorId is provided AND dailyLimit > 0)
  if (visitorId && model.dailyLimit > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.modelUsage.findUnique({
      where: {
        visitorId_modelId_date: {
          visitorId,
          modelId: id,
          date: today,
        },
      },
      select: { count: true },
    });
    const used = usage?.count || 0;

    const visitor = await db.visitor.findUnique({
      where: { id: visitorId },
      select: { isPro: true, proExpiresAt: true },
    });
    const isProActive =
      visitor?.isPro &&
      (!visitor.proExpiresAt || visitor.proExpiresAt > new Date());

    if (!isProActive && used >= model.dailyLimit) {
      return {
        allowed: false,
        reason: `You've used all ${model.dailyLimit} free ${model.label} messages for today. Come back tomorrow or upgrade to Pro for unlimited access.`,
        apiModel: model.apiModel,
        modelId: id,
      };
    }
  }

  return { allowed: true, apiModel: model.apiModel, modelId: id };
}

/**
 * Increment today's usage count for a (visitor, model) pair.
 * Failures are swallowed — don't break the chat over a counting bug.
 */
async function incrementUsage(
  visitorId: string | undefined,
  modelId: string
) {
  if (!visitorId) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    await db.modelUsage.upsert({
      where: {
        visitorId_modelId_date: {
          visitorId,
          modelId,
          date: today,
        },
      },
      update: { count: { increment: 1 } },
      create: { visitorId, modelId, date: today, count: 1 },
    });
  } catch (err) {
    console.error("[chat] usage increment error:", err);
  }
}

async function safeLog(
  visitorId: string | undefined,
  role: string,
  content: string,
  sessionId?: string,
  modelId?: string
) {
  if (!visitorId || !content) return;
  try {
    await db.chatLog.create({
      data: {
        visitorId,
        role,
        content,
        sessionId: sessionId || null,
        modelId: modelId || null,
      },
    });
    if (sessionId) {
      const session = await db.chatSession.findUnique({
        where: { id: sessionId },
        select: { title: true, _count: { select: { chats: true } } },
      });
      if (session && session.title === "New Chat" && role === "user" && session._count.chats <= 1) {
        await db.chatSession.update({
          where: { id: sessionId },
          data: {
            title: content.slice(0, 50) + (content.length > 50 ? "…" : ""),
            updatedAt: new Date(),
          },
        });
      } else {
        await db.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        }).catch(() => {});
      }
    }
    await db.visitor
      .update({
        where: { id: visitorId },
        data: { lastSeen: new Date() },
      })
      .catch(() => {});
  } catch (err) {
    console.error("[chat] log error:", err);
  }
}

/**
 * POST /api/chat
 * Streams the model's reply as Server-Sent Events (SSE).
 */
export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Missing 'messages' array in request body." },
      { status: 400 }
    );
  }

  const visitorId = body.visitorId;
  const visitorName = await resolveVisitorName(visitorId, body.visitorName);

  // ====== MODEL ACCESS CHECK ======
  const access = await checkModelAccess(visitorId, body.modelId);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason || "Access denied." },
      { status: 403 }
    );
  }
  // Build the model chain: [primary, ...fallbacks]
  // If V2 (Claude) fails, it will auto-try V1 (Mistral) and vice versa.
  const modelChain = getModelChain(access.modelId);
  const modelId = access.modelId;
  console.log(`[chat] Model chain for ${modelId}:`, modelChain);

  const systemPrompt = buildSystemPrompt(visitorName);

  const messagesForModel: ChatMessage[] = [
    { role: "assistant", content: systemPrompt },
    ...body.messages
      .filter((m) => typeof m?.content === "string" && m.content.trim().length > 0)
      .slice(-10),
  ];

  const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    void safeLog(visitorId, "user", lastUserMsg.content, body.sessionId, modelId);
  }

  // ====== IMAGE GENERATION DETECTION ======
  const imageMatch = lastUserMsg?.content?.match(
    /^(?:generate\s+image\s*[:\s]+|draw\s*[:\s]+|create\s+image\s*[:\s]+|image\s*[:\s]+)(.+)$/i
  );

  if (imageMatch) {
    const imagePrompt = imageMatch[1].trim();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const sendSafe = (obj: unknown) => {
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
          } catch {}
        };

        sendSafe({ started: true });
        sendSafe({ token: `🎨 Generating image: **${imagePrompt}**\n\n` });
        sendSafe({ imageProgress: 5 });

        let progress = 5;
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 15, 90);
          sendSafe({ imageProgress: Math.round(progress) });
        }, 800);

        try {
          let base64: string | null = null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              base64 = await generateImage(imagePrompt);
              if (base64) break;
            } catch (err) {
              console.error(`[chat image-gen] attempt ${attempt} failed:`, err);
              if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
            }
          }

          clearInterval(progressInterval);
          sendSafe({ imageProgress: 100 });

          if (base64) {
            const imageDataUrl = base64.startsWith("data:")
              ? base64
              : `data:image/png;base64,${base64}`;
            sendSafe({ token: `✅ Image generated!\n\nPrompt: *${imagePrompt}*` });
            sendSafe({ done: true, generatedImage: imageDataUrl, generatedImagePrompt: imagePrompt });
            void safeLog(visitorId, "assistant", `🎨 Generated image for: ${imagePrompt}`, body.sessionId, modelId);
            void incrementUsage(visitorId, modelId);
          } else {
            sendSafe({ token: "⚠️ Image generation failed after 3 attempts. Please try again with a different prompt." });
            sendSafe({ done: true });
            void safeLog(visitorId, "assistant", "⚠️ Image generation failed after 3 attempts.", body.sessionId, modelId);
          }
        } catch (err) {
          clearInterval(progressInterval);
          sendSafe({ token: `⚠️ Error: ${err instanceof Error ? err.message : "Unknown error"}` });
          sendSafe({ done: true });
        } finally {
          controller.close();
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
  // ====== END IMAGE GENERATION DETECTION ======

  const encoder = new TextEncoder();

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
        const hasImages = body.messages.some(
          (m) => Array.isArray(m.images) && m.images.length > 0
        );

        if (hasImages) {
          // ===== VISION (multimodal) =====
          const visionMessages: any[] = [
            { role: "assistant", content: systemPrompt },
            ...body.messages
              .filter((m) => typeof m?.content === "string" || (m.images?.length ?? 0) > 0)
              .slice(-10)
              .map((m) => {
                if (m.role === "user" && m.images && m.images.length > 0) {
                  const content: any[] = [];
                  if (m.content && m.content.trim()) {
                    content.push({ type: "text", text: m.content });
                  }
                  for (const img of m.images) {
                    content.push({ type: "image_url", image_url: { url: img } });
                  }
                  return { role: "user", content };
                }
                return { role: m.role, content: m.content };
              }),
          ];

          const reply = await createVisionChatCompletion(visionMessages, modelChain);
          fullReply = reply;
          send({ token: reply });
        } else {
          // ===== STANDARD TEXT STREAMING =====
          for await (const token of streamChatCompletion(messagesForModel, modelChain)) {
            fullReply += token;
            send({ token });
          }
        }

        send({ done: true });

        if (fullReply.trim().length > 0) {
          void safeLog(visitorId, "assistant", fullReply, body.sessionId, modelId);
          void incrementUsage(visitorId, modelId);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (fullReply.trim().length > 0) {
            void safeLog(visitorId, "assistant", fullReply, body.sessionId, modelId);
            void incrementUsage(visitorId, modelId);
          }
          try {
            send({ done: true });
          } catch {
            // ignore
          }
        } else {
          console.error("[chat/stream] error:", err);
          const message = err instanceof Error ? err.message : "Unknown error";
          send({ error: message });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
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
