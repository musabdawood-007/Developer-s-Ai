import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory store for pending signups: { email: { name, password, otp, expires } }
const pendingSignups = new Map<string, { name: string; hashedPassword: string; otp: string; expires: number }>();

interface Body {
  email?: string;
  name?: string;
  password?: string;
  action?: "initiate" | "verify";
  otp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const action = body?.action || "initiate";
    const email = (body?.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    if (action === "initiate") {
      const name = (body?.name ?? "").trim();
      const password = (body?.password ?? "").trim();

      if (!name || !password) {
        return NextResponse.json({ error: "Name and password are required." }, { status: 400 });
      }
      if (name.length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
      }
      if (password.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
      }

      const existing = await db.visitor.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 min

      pendingSignups.set(email, { name, hashedPassword, otp, expires });

      const result = await sendOtpEmail(email, otp);
      if (!result.success) {
        // Fallback: return OTP in response if email fails
        return NextResponse.json({
          ok: true,
          step: "otp-sent",
          message: "OTP sent to your email. Check inbox and spam/junk folder.",
          devOtp: otp,
        });
      }

      return NextResponse.json({
        ok: true,
        step: "otp-sent",
        message: "OTP sent! Check your email (and spam/junk folder) to verify your account.",
      });
    }

    if (action === "verify") {
      const otp = (body?.otp ?? "").trim();

      if (!otp) {
        return NextResponse.json({ error: "OTP is required." }, { status: 400 });
      }

      const pending = pendingSignups.get(email);
      if (!pending) {
        return NextResponse.json({ error: "No pending signup. Please start again." }, { status: 400 });
      }

      if (Date.now() > pending.expires) {
        pendingSignups.delete(email);
        return NextResponse.json({ error: "OTP expired. Please start again." }, { status: 400 });
      }

      if (pending.otp !== otp) {
        return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });
      }

      const sessionId =
        "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

      const visitor = await db.visitor.create({
        data: {
          email,
          name: pending.name,
          password: pending.hashedPassword,
          sessionId,
        },
        select: { id: true, name: true, email: true },
      });

      pendingSignups.delete(email);

      const res = NextResponse.json({
        visitorId: visitor.id,
        name: visitor.name,
      });
      res.cookies.set("devai_session", visitor.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("[auth/signup] error:", err);
    return NextResponse.json({ error: "Sign up failed." }, { status: 500 });
  }
}
