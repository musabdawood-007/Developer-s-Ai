import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TOKEN =
  "devai-admin-" + Buffer.from("admin:admin123").toString("base64");

/**
 * PATCH /api/admin/chats/[id]/restore
 * -----------------------------------
 * Restores a soft-deleted chat message (sets `deletedAt` back to null).
 * Requires the devai_admin cookie.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookie = req.cookies.get("devai_admin")?.value;
  if (cookie !== SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing chat id." }, { status: 400 });
    }

    await db.chatLog.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/chats/[id]/restore] error:", err);
    return NextResponse.json(
      { error: "Failed to restore chat message." },
      { status: 500 }
    );
  }
}
