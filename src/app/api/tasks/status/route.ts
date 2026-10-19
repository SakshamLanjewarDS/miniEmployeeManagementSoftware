import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { transitionTaskStatus } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, comment, auditReason } = body || {};

    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status are required" }, { status: 400 });
    }

    const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
    const effectiveAuditReason =
      auditReason ||
      comment ||
      (status === "COMPLETED" && isPrivileged
        ? `Completed and approved by Studio Leadership (${ctx.userFullName})`
        : undefined);

    const updated = await transitionTaskStatus(ctx, taskId, status, {
      comment,
      auditReason: effectiveAuditReason,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error("Task status update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to transition task status" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "Task status endpoint active" });
}

export const PATCH = POST;
