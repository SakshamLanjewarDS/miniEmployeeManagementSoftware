import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, clearSessionCookie, revokeSession } from "@/server/auth/session";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await revokeSession(token);
    }
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Logout API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
