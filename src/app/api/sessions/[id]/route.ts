import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionVisitorId = await validateSession(req);
  if (!sessionVisitorId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing session id." }, { status: 400 });
    }

    const session = await db.chatSession.findUnique({
      where: { id },
      select: { visitorId: true },
    });

    if (!session || session.visitorId !== sessionVisitorId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await db.chatSession.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sessions/[id]] delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 }
    );
  }
}
