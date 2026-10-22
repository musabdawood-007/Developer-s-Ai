import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({ sessions: [] });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    session: { id: "", title: "New Chat", createdAt: new Date().toISOString() } 
  });
}