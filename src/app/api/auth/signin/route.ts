import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  password?: string;
}

/**
 * POST /api/auth/signin
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const email = (body?.email ?? "").trim().toLowerCase();
    const password = (body?.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const visitor = await db.visitor.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "No account found with this email. Try signing up." },
        { status: 401 }
      );
    }

    if (!visitor.password) {
      return NextResponse.json(
        { error: "This account needs a password reset. Please sign up again." },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, visitor.password);
    if (!match) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    await db.visitor
      .update({
        where: { id: visitor.id },
        data: { lastSeen: new Date() },
      })
      .catch(() => {});

    const res = NextResponse.json({
      visitorId: visitor.id,
      name: visitor.name,
      email: visitor.email,
    });
    res.cookies.set("devai_session", visitor.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("[auth/signin] error:", err);
    return NextResponse.json(
      { error: "Sign in failed. Please try again." },
      { status: 500 }
    );
  }
}
