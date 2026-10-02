import { NextRequest, NextResponse } from "next/server";
import { loginWithWorkspace } from "@/server/auth/service";
import { setSessionCookie } from "@/server/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, identifier, password } = body;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Standard Direct Authentication (User ID / Email + Password)
    const result = await loginWithWorkspace({
      workspaceSlug,
      identifier,
      password,
      ipAddress,
      userAgent,
      requireOtp: false, // Normal direct login
    });

    if (!result.success || !result.sessionToken || !result.expiresAt) {
      return NextResponse.json(
        { error: result.error || "Authentication failed. Check your Employee ID and password." },
        { status: 401 }
      );
    }

    // Set secure HttpOnly session cookie
    await setSessionCookie(result.sessionToken, result.expiresAt);

    const res = NextResponse.json({
      success: true,
      user: result.user,
      redirectUrl: `/w/${workspaceSlug}/tasks`,
    });

    res.cookies.set("studio_session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });

    return res;
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
