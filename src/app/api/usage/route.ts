import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MODELS } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/usage?visitorId=xxx
 *
 * Returns the visitor's current daily usage and remaining messages
 * for each available model.
 */
export async function GET(req: NextRequest) {
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId) {
    return NextResponse.json(
      { error: "Missing visitorId." },
      { status: 400 }
    );
  }

  try {
    const visitor = await db.visitor.findUnique({
      where: { id: visitorId },
      select: {
        isPro: true,
        proExpiresAt: true,
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "Visitor not found." },
        { status: 404 }
      );
    }

    const isProActive =
      visitor.isPro &&
      (!visitor.proExpiresAt || visitor.proExpiresAt > new Date());

    const today = new Date().toISOString().slice(0, 10);

    const usages = await db.modelUsage.findMany({
      where: {
        visitorId,
        date: today,
      },
      select: {
        modelId: true,
        count: true,
      },
    });

    const usageMap = new Map<string, number>();
    for (const u of usages) {
      usageMap.set(u.modelId, u.count);
    }

    const models = MODELS.map((m) => {
      const used = usageMap.get(m.id) || 0;
      const isProModel = m.tier === "pro";

      let remaining: number;
      if (isProActive) {
        remaining = -1;
      } else if (isProModel) {
        remaining = 0;
      } else if (m.dailyLimit === 0) {
        remaining = -1;
      } else {
        remaining = Math.max(0, m.dailyLimit - used);
      }

      return {
        id: m.id,
        label: m.label,
        tagline: m.tagline,
        badge: m.badge,
        tier: m.tier,
        vision: m.vision,
        dailyLimit: m.dailyLimit,
        used,
        remaining,
        locked: isProModel && !isProActive,
      };
    });

    return NextResponse.json({
      isPro: isProActive,
      proExpiresAt: visitor.proExpiresAt,
      models,
      date: today,
    });
  } catch (err) {
    console.error("[api/usage] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch usage." },
      { status: 500 }
    );
  }
}
