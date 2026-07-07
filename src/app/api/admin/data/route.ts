import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TOKEN =
  "devai-admin-" + Buffer.from("admin:admin123").toString("base64");

/**
 * GET /api/admin/data
 * Returns all visitors and their chat logs. Requires the devai_admin cookie.
 */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("devai_admin")?.value;
  if (cookie !== SESSION_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const visitors = await db.visitor.findMany({
      orderBy: { lastSeen: "desc" },
      include: {
        chats: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            userHiddenAt: true,
          },
        },
      },
    });

    return NextResponse.json({ visitors });
  } catch (err) {
    console.error("[admin/data] error:", err);
    return NextResponse.json(
      { error: "Failed to load admin data." },
      { status: 500 }
    );
  }
}
