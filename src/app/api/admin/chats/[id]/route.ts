import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TOKEN =
  "devai-admin-" + Buffer.from("admin:admin123").toString("base64");

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookie = req.cookies.get("devai_admin")?.value;
  if (cookie !== SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const permanent = url.searchParams.get("permanent") === "true";
    const visitorId = url.searchParams.get("visitorId");

    if (id === "all" && visitorId) {
      if (permanent) {
        await db.chatLog.deleteMany({
          where: { visitorId, deletedAt: { not: null } },
        });
      } else {
        await db.chatLog.updateMany({
          where: { visitorId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing chat id." }, { status: 400 });
    }

    if (permanent) {
      await db.chatLog.delete({ where: { id } });
    } else {
      await db.chatLog.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/chats/[id]] error:", err);
    return NextResponse.json(
      { error: "Failed to delete chat message." },
      { status: 500 }
    );
  }
}
