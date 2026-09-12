import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  otp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const email = (body?.email ?? "").trim().toLowerCase();
    const otp = (body?.otp ?? "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required." },
        { status: 400 }
      );
    }

    const record = await db.otpToken.findFirst({
      where: { email, type: "reset" },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No OTP requested. Please request a new OTP." },
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
        { error: "Incorrect OTP. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      message: "OTP verified! Now set your new password.",
    });
  } catch (err) {
    console.error("[verify-otp] error:", err);
    return NextResponse.json(
      { error: "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
