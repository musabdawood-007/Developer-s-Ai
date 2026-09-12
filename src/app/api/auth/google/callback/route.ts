import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = (process.env.NEXTAUTH_URL || req.nextUrl.origin).replace(/\/+$/, "");

  if (!code) {
    return NextResponse.redirect(`${baseUrl}?error=No+code+received`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}?error=Token+exchange+failed`);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!googleUser.email) {
      return NextResponse.redirect(`${baseUrl}?error=Could+not+fetch+email`);
    }

    const email = googleUser.email.toLowerCase();
    const name = googleUser.name || email.split("@")[0];

    let visitor = await db.visitor.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!visitor) {
      const sessionId = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      visitor = await db.visitor.create({
        data: {
          email,
          name,
          sessionId,
          profilePicture: googleUser.picture || null,
        },
        select: { id: true, name: true, email: true },
      });
    }

    const res = NextResponse.redirect(`${baseUrl}?google_login=1`);
    res.cookies.set("devai_session", visitor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("[google/callback] error:", err);
    return NextResponse.redirect(`${baseUrl}?error=Google+sign-in+failed`);
  }
}
