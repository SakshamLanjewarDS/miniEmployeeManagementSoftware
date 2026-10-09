import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getProfileOverview,
  updateSelfProfile,
  submitOfficialRecordChangeRequest,
} from "@/server/modules/profile/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const membershipId = searchParams.get("membershipId") || undefined;

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const data = await getProfileOverview(ctx, membershipId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const body = await req.json();
    const { action, ...payload } = body;

    if (action === "SELF_UPDATE") {
      const result = await updateSelfProfile(ctx, {
        fullName: payload.fullName,
        phone: payload.phone,
      });
      return NextResponse.json(result);
    }

    if (action === "REQUEST_OFFICIAL_CHANGE") {
      const result = await submitOfficialRecordChangeRequest(ctx, {
        fieldKey: payload.fieldKey,
        newValue: payload.newValue,
        reason: payload.reason,
      });
      return NextResponse.json({ success: true, request: result }, { status: 201 });
    }

    return NextResponse.json({ error: `Unsupported profile action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 400 });
  }
}
