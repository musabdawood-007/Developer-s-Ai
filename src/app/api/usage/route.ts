import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSession } from "@/lib/auth";
import { MODELS } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionVisitorId = await validateSession(req);
  if (!sessionVisitorId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const visitorId = req.nextUrl.searchParams.get("visitorId");
  if (!visitorId || visitorId !== sessionVisitorId) {
    return NextResponse.json(
      { error: "Missing or invalid visitorId." },
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
      const unlimited = m.tier === "pro" ? isProActive : m.dailyLimit === 0;
      const remaining = unlimited
        ? -1
        : Math.max(0, m.dailyLimit - used);
      const locked = m.tier === "pro" && !isProActive;

      return {
        id: m.id,
        label: m.label,
        tagline: m.tagline,
        badge: m.badge,
        tier: m.tier,
        dailyLimit: m.dailyLimit,
        used,
        remaining,
        locked,
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
