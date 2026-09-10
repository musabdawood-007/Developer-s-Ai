import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/zai-client";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateImageBody {
  prompt?: string;
  size?: "1024x1024" | "512x512" | "1792x1024";
  visitorId?: string;
}

export async function POST(req: NextRequest) {
  let body: GenerateImageBody;
  try {
    body = (await req.json()) as GenerateImageBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const prompt = (body?.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 }
    );
  }

  if (prompt.length > 1000) {
    return NextResponse.json(
      { error: "Prompt is too long (max 1000 chars)." },
      { status: 400 }
    );
  }

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generateImage(prompt);

      if (!result) {
        lastError = "API returned no image data.";
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        break;
      }

      let imageDataUrl: string;
      if (result.startsWith("data:")) {
        imageDataUrl = result;
      } else if (result.startsWith("http")) {
        imageDataUrl = result;
      } else {
        imageDataUrl = `data:image/png;base64,${result}`;
      }

      // Log the generation (fire-and-forget)
      if (body.visitorId) {
        void db.chatLog
          .create({
            data: {
              visitorId: body.visitorId,
              role: "assistant",
              content: `🎨 Generated image: ${prompt}`,
              sessionId: null,
              modelId: "image-gen",
            },
          })
          .catch(() => {});
      }

      return NextResponse.json({
        imageDataUrl,
        prompt,
        attempt,
      });
    } catch (err: any) {
      lastError = err?.message || "Unknown error";
      console.error(`[generate-image] attempt ${attempt} failed:`, err);

      // If it's a payment/rate-limit error, no point retrying
      if (
        err?.message?.includes("payment_required") ||
        err?.message?.includes("402")
      ) {
        return NextResponse.json(
          {
            error:
              "Image generation quota exceeded on the API. Please try again later.",
          },
          { status: 402 }
        );
      }

      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  return NextResponse.json(
    {
      error:
        lastError ||
        "Image generation failed after 3 attempts. Please try a different prompt.",
    },
    { status: 500 }
  );
}
