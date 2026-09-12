import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      const otp = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await db.otpToken.deleteMany({ where: { email, type: "signup" } });

      await db.otpToken.create({
        data: {
          email,
          otp,
          type: "signup",
          metadata: JSON.stringify({ name, hashedPassword }),
          expires,
        },
      });

      await sendOtpEmail(email, otp);

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

      const record = await db.otpToken.findFirst({
        where: { email, type: "signup" },
        orderBy: { createdAt: "desc" },
      });

      if (!record) {
        return NextResponse.json({ error: "No pending signup. Please start again." }, { status: 400 });
      }

      if (new Date() > record.expires) {
        await db.otpToken.deleteMany({ where: { email, type: "signup" } });
        return NextResponse.json({ error: "OTP expired. Please start again." }, { status: 400 });
      }

      if (record.otp !== otp) {
        return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });
      }

      const metadata = record.metadata ? JSON.parse(record.metadata) : {};
      const sessionId = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

      const visitor = await db.visitor.create({
        data: {
          email,
          name: metadata.name,
          password: metadata.hashedPassword,
          sessionId,
        },
        select: { id: true, name: true, email: true },
      });

      await db.otpToken.deleteMany({ where: { email, type: "signup" } });

      const res = NextResponse.json({
        visitorId: visitor.id,
        name: visitor.name,
        email: visitor.email,
      });
      res.cookies.set("devai_session", visitor.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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
