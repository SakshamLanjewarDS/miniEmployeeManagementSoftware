import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getStudioWorkloadCapacity,
  previewWorkloadAdjustment,
  applyWorkloadAdjustment,
} from "@/server/modules/capacity/service";
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug =
      searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const todayStr = formatDate(new Date());
    const defaultEndStr = formatDate(addDays(new Date(), 13)); // 2 weeks default

    const startDate = searchParams.get("startDate") || todayStr;
    const endDate = searchParams.get("endDate") || defaultEndStr;
    const projectId = searchParams.get("projectId") || undefined;
    const department = searchParams.get("department") || undefined;

    const capacityData = await getStudioWorkloadCapacity(ctx, {
      startDate,
      endDate,
      projectId,
      department,
    });

    return NextResponse.json({ success: true, ...capacityData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load workload capacity data" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { action, taskId, targetAssigneeId, newStartDate, newDueDate, reason } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    if (action === "preview") {
      const preview = await previewWorkloadAdjustment(ctx, {
        taskId,
        targetAssigneeId,
        newStartDate,
        newDueDate,
      });
      return NextResponse.json({ success: true, preview });
    }

    if (action === "adjust") {
      if (!reason?.trim()) {
        return NextResponse.json(
          { error: "A justification reason is required for adjustments." },
          { status: 400 }
        );
      }
      const updatedTask = await applyWorkloadAdjustment(ctx, {
        taskId,
        targetAssigneeId,
        newStartDate,
        newDueDate,
        reason: reason.trim(),
      });
      return NextResponse.json({ success: true, task: updatedTask });
    }

    return NextResponse.json(
      { error: "Invalid action. Expected 'preview' or 'adjust'." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process workload adjustment" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
