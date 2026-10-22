import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Anonymous guest session — PRD §3A: "No Login Wall for Initial Chat".
 * Creates an ephemeral visitor so the user can start chatting without
 * signup. Guests persist per-browser via the session cookie and can be
 * upgraded to a full account later (same Visitor row).
 */
export async function POST(req: NextRequest) {
  try {
    const suffix = randomBytes(6).toString("hex");
    const guest = await db.visitor.create({
      data: {
        email: `guest-${suffix}@pulse.local`,
        name: "Friend",
        sessionId: `pulse-guest-${suffix}`,
        isGuest: true,
      },
      select: { id: true },
    });

    const res = NextResponse.json({
      visitorId: guest.id,
      name: "Friend",
    });
    res.cookies.set("pulse_session", guest.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("[auth/guest] error:", err);
    return NextResponse.json(
      { error: "Couldn't start guest session. Please try again." },
      { status: 500 }
    );
  }
}
