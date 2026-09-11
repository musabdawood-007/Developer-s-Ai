import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/chat-config";
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
  visitorName?: string;
  modelId?: string;
}

async function resolveVisitorName(
  visitorName: string | undefined
): Promise<string | undefined> {
  if (visitorName && visitorName.trim()) return visitorName.trim();
  return undefined;
}

async function checkModelAccess(
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

  return { allowed: true, apiModel: model.apiModel, modelId: id };
}


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

  const visitorName = await resolveVisitorName(body.visitorName);

  const access = await checkModelAccess(body.modelId);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason || "Access denied." },
      { status: 403 }
    );
  }
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
          } else {
            sendSafe({ token: "⚠️ Image generation failed after 3 attempts. Please try again with a different prompt." });
            sendSafe({ done: true });
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
          for await (const token of streamChatCompletion(messagesForModel, modelChain)) {
            fullReply += token;
            send({ token });
          }
        }

        send({ done: true });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          try {
            send({ done: true });
          } catch {}
        } else {
          console.error("[chat/stream] error:", err);
          const message = err instanceof Error ? err.message : "Unknown error";
          send({ error: message });
        }
      } finally {
        try {
          controller.close();
        } catch {}
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
