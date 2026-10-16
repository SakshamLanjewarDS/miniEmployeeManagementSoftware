import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getStudioPerformanceData } from "@/server/modules/performance/service";
import { DatePreset } from "@/server/modules/performance/date-controls";
import { sanitizeCsvCell } from "@/server/modules/csv/csv-parser";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership authority required to export Employee Performance" },
        { status: 403 }
      );
    }

    const preset = (searchParams.get("preset") as DatePreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const department = searchParams.get("department") || undefined;

    const data = await getStudioPerformanceData(ctx, {
      preset,
      customStart,
      customEnd,
      filters: { department },
    });

    // Audit the sensitive export event
    try {
      await prisma.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.membershipId,
          action: "PERFORMANCE_REPORT_EXPORTED",
          entityType: "EmployeePerformance",
          entityId: ctx.tenantId,
          safeChangeSummary: `${ctx.userFullName} (${ctx.role}) exported Employee Performance CSV for period ${data.period.startDate} to ${data.period.endDate}`,
        },
      });
    } catch {
      // Non-fatal
    }

    // Build RFC 4180 CSV with OWASP formula-injection protection
    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Designation",
      "Talent Quadrant",
      "Burnout Risk",
      "Capacity Utilization (%)",
      "Assigned Deliverables",
      "Completed Deliverables",
      "Governed Completed",
      "Operational Completed",
      "Due in Period",
      "On-Time Completed",
      "On-Time Rate (%)",
      "Overdue Deliverables",
      "First-Pass Approved",
      "First-Pass Decided",
      "First-Pass Rate (%)",
      "Rework Cycles",
      "Drafting Hours",
      "Review Wait Hours",
      "Active Blockers",
      "Site Visits Completed",
      "Site Issues Resolved",
      "Attendance Punctuality (%)",
      "Overtime Hours",
      "Scheduled Hours",
      "Approved Leave Hours",
      "Available Capacity (Hrs)",
      "Allocated Hours",
      "Actual Logged Hours",
    ];

    const rows: string[] = [];
    rows.push(headers.map(sanitizeCsvCell).join(","));

    for (const r of data.employees) {
      const line = [
        r.code,
        r.name,
        r.department,
        r.designation,
        r.talentQuadrant,
        r.burnoutRisk,
        `${r.utilizationPercent}%`,
        r.assignedCount,
        r.completedCount,
        r.governedCompletedCount,
        r.operationalCompletedCount,
        r.dueCount,
        r.onTimeCount,
        r.onTimeRatePercent !== null ? `${r.onTimeRatePercent}%` : "N/A",
        r.overdueCount,
        r.firstPassApprovedCount,
        r.firstPassDecidedCount,
        r.firstPassRatePercent !== null ? `${r.firstPassRatePercent}%` : "N/A",
        r.reworkCount,
        r.draftingHours,
        r.reviewWaitHours,
        r.activeBlockerCount,
        r.siteVisitsCount,
        r.siteIssuesResolvedCount,
        r.attendancePunctualityPercent !== null ? `${r.attendancePunctualityPercent}%` : "N/A",
        r.overtimeHours,
        r.scheduledHours,
        r.leaveDeductionHours,
        r.availableCapacityHours,
        r.allocatedEstimatedHours,
        r.actualLoggedHours,
      ];
      rows.push(line.map(sanitizeCsvCell).join(","));
    }

    const csvContent = rows.join("\r\n");
    const filename = `${workspaceSlug}-employee-performance-${data.period.startDate}-to-${data.period.endDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("GET /api/performance/export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export performance report" },
      { status: 500 }
    );
  }
}
