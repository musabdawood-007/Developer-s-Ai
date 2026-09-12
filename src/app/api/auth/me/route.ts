import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const visitorId = req.cookies.get("devai_session")?.value;
  if (!visitorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const visitor = await db.visitor.findUnique({
    where: { id: visitorId },
    select: { id: true, name: true, email: true },
  });

  if (!visitor) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    visitorId: visitor.id,
    name: visitor.name,
    email: visitor.email,
  });
}
