import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { prisma } from "@/server/db/prisma";
import { sendCredentialNotification } from "@/server/modules/notifications/credential-mailer";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Only Studio Administrators or Owners can dispatch credentials." },
        { status: 403 }
      );
    }

    const { membershipId, password, customMessage, actionType = "MANUAL_DISPATCH" } = body;

    if (!membershipId || !password) {
      return NextResponse.json(
        { error: "membershipId and password are required" },
        { status: 400 }
      );
    }

    // Resolve target member
    const target = await prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: ctx.tenantId },
      include: { user: true, employee: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Member not found in this studio" }, { status: 404 });
    }

    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${hostHeader}`;

    const notification = await sendCredentialNotification({
      tenantId: ctx.tenantId,
      tenantSlug: ctx.tenantSlug,
      tenantName: ctx.tenantName || "100% DESIGN Studio",
      recipientEmail: target.user.email,
      recipientPhone: target.employee?.phone,
      recipientName: target.user.fullName,
      recipientMembershipId: target.id,
      employeeId: target.employee?.employeeId || "STUDIO-MEMBER",
      password,
      customMessage,
      actionType,
      baseUrl,
    });

    // Audit log
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "CREDENTIALS_DISPATCHED",
        entityType: "User",
        entityId: target.userId,
        safeChangeSummary: `Dispatched login credentials notification for ${target.user.fullName} (${target.user.email})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Credentials dispatched for ${target.user.fullName}`,
      notification,
    });
  } catch (err: any) {
    console.error("Credential dispatch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch credentials" },
      { status: 500 }
    );
  }
}
