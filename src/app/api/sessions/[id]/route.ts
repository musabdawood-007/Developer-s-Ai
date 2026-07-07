import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/sessions/[id]
 * Deletes a chat session AND all its messages (cascade).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing session id." }, { status: 400 });
    }

    // This cascades to ChatLog via the onDelete: Cascade in the schema
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
