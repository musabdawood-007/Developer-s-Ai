import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function getSessionVisitorId(req: NextRequest): Promise<string | null> {
  const visitorId = req.cookies.get("pulse_session")?.value;
  if (!visitorId) return null;

  const visitor = await db.visitor.findUnique({
    where: { id: visitorId },
    select: { id: true },
  });

  return visitor?.id || null;
}
