import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { saveInspectionReport, reviewInspectionReport } from "@/server/modules/visits/service";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const visitId = searchParams.get("visitId");

    if (!workspaceSlug || !visitId) {
      return NextResponse.json({ error: "Missing workspaceSlug or visitId" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await prisma.siteVisitInspectionReport.findMany({
      where: { visitId, tenantId: ctx.tenantId },
      include: {
        participant: {
          include: {
            membership: { include: { user: true, employee: true } },
          },
        },
        reviewer: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch reports" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reportId, decision, comment, visitId, checklistAnswersJson, observations, photosJson, snagsJson, isFinalSubmission } = body;

    if (action === "REVIEW") {
      if (!reportId || !decision) {
        return NextResponse.json({ error: "reportId and decision are required for review." }, { status: 400 });
      }
      const reviewed = await reviewInspectionReport(ctx, reportId, decision, comment);
      return NextResponse.json({ success: true, report: reviewed });
    }

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required." }, { status: 400 });
    }

    const saved = await saveInspectionReport(ctx, {
      visitId,
      checklistAnswersJson,
      observations,
      photosJson,
      snagsJson,
      isFinalSubmission: Boolean(isFinalSubmission),
    });

    return NextResponse.json({ success: true, report: saved });
  } catch (error: any) {
    console.error("POST /api/visits/journey/report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process inspection report" },
      { status: 400 }
    );
  }
}
