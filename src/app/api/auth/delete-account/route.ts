import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  visitorId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const visitorId = (body?.visitorId ?? "").trim();

    if (!visitorId) {
      return NextResponse.json({ error: "Visitor ID required." }, { status: 400 });
    }

    // Delete all chat logs first (manual cleanup for MongoDB)
    await db.chatLog.deleteMany({ where: { visitorId } }).catch(() => {});
    await db.chatSession.deleteMany({ where: { visitorId } }).catch(() => {});
    await db.visitor.delete({ where: { id: visitorId } });

    const res = NextResponse.json({ ok: true });
    res.cookies.delete("devai_session");
    return res;
  } catch (err) {
    console.error("[delete-account] error:", err);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 }
    );
  }
}
