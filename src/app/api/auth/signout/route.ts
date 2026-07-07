import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/signout
 *
 * Clears the httpOnly session cookie. The client also clears localStorage.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("devai_session");
  return res;
}
