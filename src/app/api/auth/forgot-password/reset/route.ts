import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  otp?: string;
  newPassword?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const email = (body?.email ?? "").trim().toLowerCase();
    const otp = (body?.otp ?? "").trim();
    const newPassword = (body?.newPassword ?? "").trim();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters." },
        { status: 400 }
      );
    }

    const record = await db.otpToken.findFirst({
      where: { email, type: "reset" },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "OTP session expired. Please restart the process." },
        { status: 400 }
      );
    }

    if (new Date() > record.expires) {
      await db.otpToken.deleteMany({ where: { email, type: "reset" } });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { error: "Incorrect OTP." },
        { status: 401 }
      );
    }

    const visitor = await db.visitor.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!visitor) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.visitor.update({
      where: { id: visitor.id },
      data: { password: hashedPassword },
    });

    await db.otpToken.deleteMany({ where: { email, type: "reset" } });

    return NextResponse.json({
      ok: true,
      message: "Password reset successful! Sign in with your new password.",
    });
  } catch (err) {
    console.error("[reset] error:", err);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
