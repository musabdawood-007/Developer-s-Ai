import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  visitorId?: string;
  name?: string;
  profilePicture?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const visitorId = (body?.visitorId ?? "").trim();
    const name = body?.name?.trim();
    const profilePicture = body?.profilePicture?.trim();

    if (!visitorId) {
      return NextResponse.json({ error: "Visitor ID required." }, { status: 400 });
    }

    const data: any = {};
    if (name && name.length >= 2) data.name = name;
    if (profilePicture !== undefined) data.profilePicture = profilePicture || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updated = await db.visitor.update({
      where: { id: visitorId },
      data,
      select: { id: true, name: true, email: true, profilePicture: true },
    });

    return NextResponse.json({
      ok: true,
      name: updated.name,
      profilePicture: updated.profilePicture,
    });
  } catch (err) {
    console.error("[update-profile] error:", err);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
