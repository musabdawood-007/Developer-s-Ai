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

/**
 * POST /api/generate-image
 *
 * Generates a single image from a text prompt using the configured LLM API.
 * Returns { imageDataUrl } (a base64 data URL ready to render in <img src>).
 *
 * If the LLM API returns a URL instead of base64, we still wrap it as a data URL
 * only when it's already base64 — otherwise we return the URL directly.
 *
 * On failure, returns { error } with HTTP 500.
 */
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

  // Try up to 3 attempts — image gen APIs sometimes rate-limit cold starts.
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

      // If result is already a data URL, use it as-is.
      // If it's a URL (https://...), return it directly — the <img> tag will load it.
      // If it's raw base64, wrap it in a data URL.
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

  // All attempts failed — return a friendly error
  return NextResponse.json(
    {
      error:
        lastError ||
        "Image generation failed after 3 attempts. Please try a different prompt.",
    },
    { status: 500 }
  );
}
