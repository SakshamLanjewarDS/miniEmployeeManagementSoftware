import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import {
  syncLiveLeaveSheet,
  syncLiveVendorSheet,
  DEFAULT_LEAVE_SHEET_ID,
  DEFAULT_VENDOR_SHEET_ID,
  DEFAULT_LEAVE_CSV_URL,
  DEFAULT_VENDOR_CSV_URL,
} from "@/server/modules/integrations/google-sheets-sync";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const syncType = searchParams.get("syncType"); // "LEAVE_SHEET" | "VENDOR_SHEET" | null
    // GET is strictly idempotent and read-only. State-mutating synchronizations are restricted to authenticated POST/PUT methods.

    // Retrieve configs and latest metrics
    const [leaveConfig, vendorConfig, totalLeaves, totalVendors, latestLeaveRun, latestVendorRun, tenant] =
      await Promise.all([
        prisma.studioSyncConfig.findUnique({
          where: { tenantId_syncType: { tenantId: ctx.tenantId, syncType: "LEAVE_SHEET" } },
        }),
        prisma.studioSyncConfig.findUnique({
          where: { tenantId_syncType: { tenantId: ctx.tenantId, syncType: "VENDOR_SHEET" } },
        }),
        prisma.studioLeaveRequest.count({
          where: { tenantId: ctx.tenantId, deletedAt: null },
        }),
        prisma.studioVendor.count({
          where: { tenantId: ctx.tenantId, status: { not: "DELETED" } },
        }),
        prisma.studioSyncRun.findFirst({
          where: { tenantId: ctx.tenantId, syncType: "LEAVE_SHEET" },
          orderBy: { startedAt: "desc" },
        }),
        prisma.studioSyncRun.findFirst({
          where: { tenantId: ctx.tenantId, syncType: "VENDOR_SHEET" },
          orderBy: { startedAt: "desc" },
        }),
        prisma.tenant.findUnique({
          where: { id: ctx.tenantId },
          select: { settings: true },
        }),
      ]);

    const tenantSettings = (tenant?.settings as any) || {};
    const leaveWebhookUrl =
      (leaveConfig as any)?.webhookUrl ||
      tenantSettings.googleSheetsLeaveWebhookUrl ||
      process.env.GOOGLE_SHEETS_LEAVE_WEBHOOK_URL ||
      null;

    return NextResponse.json({
      success: true,
      leaveSheet: {
        sheetId: leaveConfig?.sheetId || DEFAULT_LEAVE_SHEET_ID,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${leaveConfig?.sheetId || DEFAULT_LEAVE_SHEET_ID}/edit`,
        csvUrl: DEFAULT_LEAVE_CSV_URL,
        webhookUrl: leaveWebhookUrl,
        isWebhookConnected: Boolean(leaveWebhookUrl),
        lastAttemptAt: leaveConfig?.lastAttemptAt?.toISOString() || null,
        lastSuccessAt: leaveConfig?.lastSuccessAt?.toISOString() || null,
        status: leaveConfig?.lastStatus || "NEVER_RUN",
        totalActiveRecords: totalLeaves,
        lastRun: latestLeaveRun
          ? {
              importedCount: latestLeaveRun.importedCount,
              updatedCount: latestLeaveRun.updatedCount,
              unchangedCount: latestLeaveRun.unchangedCount,
              failedCount: latestLeaveRun.failedCount,
              status: latestLeaveRun.status,
            }
          : null,
      },
      vendorSheet: {
        sheetId: vendorConfig?.sheetId || DEFAULT_VENDOR_SHEET_ID,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${vendorConfig?.sheetId || DEFAULT_VENDOR_SHEET_ID}/edit`,
        csvUrl: DEFAULT_VENDOR_CSV_URL,
        lastAttemptAt: vendorConfig?.lastAttemptAt?.toISOString() || null,
        lastSuccessAt: vendorConfig?.lastSuccessAt?.toISOString() || null,
        status: vendorConfig?.lastStatus || "NEVER_RUN",
        totalActiveRecords: totalVendors,
        lastRun: latestVendorRun
          ? {
              importedCount: latestVendorRun.importedCount,
              updatedCount: latestVendorRun.updatedCount,
              unchangedCount: latestVendorRun.unchangedCount,
              failedCount: latestVendorRun.failedCount,
              status: latestVendorRun.status,
            }
          : null,
      },
      protectionGuarantees: {
        tombstoneShield: "ACTIVE — Soft-deleted records are permanently blacklisted from resurrection on sync.",
        localAuthorityShield: "ACTIVE — In-app approvals and rejections override stale sheet pending statuses.",
        outboundWriteBack: leaveWebhookUrl ? "CONNECTED — Approvals, rejections, and deletions automatically update cells in real-time." : "PENDING_WEBHOOK — Configure Webhook URL to enable real-time write-back.",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get sync status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Triggering live sync requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    // Configure Webhook URL action
    if (body.action === "CONFIGURE_WEBHOOK" || (body.webhookUrl !== undefined && body.action !== "SYNC")) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { settings: true },
      });
      const settings = (tenant?.settings as any) || {};
      const updatedSettings = {
        ...settings,
        googleSheetsLeaveWebhookUrl: body.webhookUrl?.trim() || null,
      };
      await prisma.tenant.update({
        where: { id: ctx.tenantId },
        data: { settings: updatedSettings },
      });

      return NextResponse.json({
        success: true,
        webhookUrl: body.webhookUrl?.trim() || null,
        message: body.webhookUrl?.trim()
          ? "Google Sheets 2-Way Webhook connected successfully! Approvals, rejections, and deletions will now dynamically reflect on the sheet in real time."
          : "Google Sheets Webhook URL cleared.",
      });
    }

    const syncType = body.syncType || "ALL"; // "ALL" | "LEAVE_SHEET" | "VENDOR_SHEET"
    let leaveResult = null;
    let vendorResult = null;

    if (syncType === "ALL" || syncType === "LEAVE_SHEET") {
      leaveResult = await syncLiveLeaveSheet(ctx, body.leaveSheetUrl);
    }

    if (syncType === "ALL" || syncType === "VENDOR_SHEET") {
      vendorResult = await syncLiveVendorSheet(ctx, body.vendorSheetUrl);
    }

    return NextResponse.json({
      success: true,
      leaveResult,
      vendorResult,
      message: "Live synchronization completed successfully with tombstone protection.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sync execution failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to trigger sync" },
        { status: 403 }
      );
    }

    const syncType = searchParams.get("syncType") || "LEAVE_SHEET";
    let leaveResult = null;
    let vendorResult = null;

    if (syncType === "ALL" || syncType === "LEAVE_SHEET") {
      leaveResult = await syncLiveLeaveSheet(ctx);
    }

    if (syncType === "ALL" || syncType === "VENDOR_SHEET") {
      vendorResult = await syncLiveVendorSheet(ctx);
    }

    return NextResponse.json({
      success: true,
      inserted: leaveResult?.importedCount ?? 0,
      updated: leaveResult?.updatedCount ?? 0,
      leaveResult,
      vendorResult,
      message: "Sync completed successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Manual sync execution failed" }, { status: 500 });
  }
}

