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
    if (!id) {
      return NextResponse.json(
        { error: "Missing visitor id." },
        { status: 400 }
      );
    }

    await db.visitor.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/visitors/[id]] error:", err);
    return NextResponse.json(
      { error: "Failed to delete visitor." },
      { status: 500 }
    );
  }
}
