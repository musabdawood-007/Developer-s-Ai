import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "../send-otp/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  otp?: string;
}

/**
 * POST /api/auth/forgot-password/verify-otp
 * Body: { email, otp }
 * Only verifies the OTP — does NOT reset password yet.
 * Returns { ok: true, verified: true } if correct.
 */
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

    const stored = otpStore.get(email);
    if (!stored) {
      return NextResponse.json(
        { error: "No OTP requested. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (stored.otp !== otp) {
      return NextResponse.json(
        { error: "Incorrect OTP. Please try again." },
        { status: 401 }
      );
    }

    // OTP is correct — don't delete yet, reset endpoint will delete it
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
