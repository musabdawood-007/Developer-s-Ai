import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionVisitorId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  modelId?: string;
  rating?: string;
  comment?: string;
}

/**
 * PULSE feedback loop (PRD §7): thumbs up/down after every reply.
 * Stored so prompts can be fine-tuned later.
 */
export async function POST(req: NextRequest) {
  const visitorId = await getSessionVisitorId(req);
  if (!visitorId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rating = body?.rating === "up" ? "up" : body?.rating === "down" ? "down" : null;
  if (!rating) {
    return NextResponse.json(
      { error: "rating must be 'up' or 'down'." },
      { status: 400 }
    );
  }

  try {
    await db.feedback.create({
      data: {
        visitorId,
        modelId: body.modelId || null,
        rating,
        comment: body.comment?.slice(0, 500) || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] error:", err);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}
