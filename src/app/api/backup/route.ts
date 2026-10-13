import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getBackupVerificationOverview,
  recordStudioBackupRun,
  runIsolatedRestoreVerificationTest,
  generateTenantSafeExportManifest,
} from "@/server/modules/storage/backup";

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

    const overview = await getBackupVerificationOverview(ctx);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load backup verification status" },
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

    const { action } = body;

    if (action === "VERIFY_RESTORE") {
      const { backupLogId } = body;
      if (!backupLogId) {
        return NextResponse.json({ error: "backupLogId is required." }, { status: 400 });
      }
      const result = await runIsolatedRestoreVerificationTest(ctx, backupLogId);
      return NextResponse.json(result);
    }

    if (action === "RECORD") {
      const { backupIdentifier, scope, sizeBytes, checksum, status, retentionDays, notes } = body;
      if (!backupIdentifier || !scope) {
        return NextResponse.json({ error: "backupIdentifier and scope are required." }, { status: 400 });
      }
      const result = await recordStudioBackupRun(ctx, {
        backupIdentifier,
        scope,
        sizeBytes,
        checksum,
        status: status || "SUCCESS",
        retentionDays,
        notes,
      });
      return NextResponse.json({ success: true, backup: result });
    }

    if (action === "MANIFEST") {
      const result = await generateTenantSafeExportManifest(ctx);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process backup request" },
      { status: err.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
