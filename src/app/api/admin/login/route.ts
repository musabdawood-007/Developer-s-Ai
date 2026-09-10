import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hardcoded admin credentials (per the developer's request).
// NOTE: This is a "secret" portal, not production-grade security.
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const SESSION_TOKEN = "devai-admin-" + Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString("base64");

interface Body {
  username?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const username = (body?.username ?? "").trim();
    const password = (body?.password ?? "").trim();

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("devai_admin", SESSION_TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });
    return res;
  } catch (err) {
    console.error("[admin/login] error:", err);
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
