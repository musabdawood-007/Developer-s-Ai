import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  visitorId?: string;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const visitorId = url.searchParams.get("visitorId");
  if (!visitorId) {
    return NextResponse.json({ error: "Missing visitorId" }, { status: 400 });
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
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const visitorId = body?.visitorId?.trim();
  if (!visitorId) {
    return NextResponse.json({ error: "Missing visitorId" }, { status: 400 });
  }

  const session = await db.chatSession.create({
    data: { visitorId, title: "New Chat" },
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json({ session });
}
