import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  visitorId?: string;
}

export async function GET(req: NextRequest) {
  const sessionVisitorId = await validateSession(req);
  if (!sessionVisitorId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const visitorId = url.searchParams.get("visitorId");
    if (!visitorId || visitorId !== sessionVisitorId) {
      return NextResponse.json({ error: "Missing or invalid visitorId" }, { status: 400 });
    }

    const sessions = await db.chatSession.findMany({
      where: { visitorId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { chats: { where: { deletedAt: null, userHiddenAt: null } } } },
      },
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[sessions/get] error:", err);
    return NextResponse.json({ error: "Failed to fetch sessions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionVisitorId = await validateSession(req);
  if (!sessionVisitorId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Body;
    const visitorId = body?.visitorId?.trim();
    if (!visitorId || visitorId !== sessionVisitorId) {
      return NextResponse.json({ error: "Missing or invalid visitorId" }, { status: 400 });
    }

    const session = await db.chatSession.create({
      data: { visitorId, title: "New Chat" },
      select: { id: true, title: true, createdAt: true },
    });

    return NextResponse.json({ session });
  } catch (err) {
    console.error("[sessions/post] error:", err);
    return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
  }
}
