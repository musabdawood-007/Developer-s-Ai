import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const email = (body?.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const visitor = await db.visitor.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.otpToken.deleteMany({ where: { email, type: "reset" } });

    await db.otpToken.create({
      data: {
        email,
        otp,
        type: "reset",
        expires,
      },
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json({
      ok: true,
      message: "OTP sent to your email. Check your inbox (and spam folder).",
    });
  } catch (err) {
    console.error("[send-otp] error:", err);
    return NextResponse.json(
      { error: "Failed to send OTP." },
      { status: 500 }
    );
  }
}
