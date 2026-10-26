import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext, resolveSessionAndTenant, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { readPrivateFile } from "@/server/storage/storage-adapter";
import { prisma } from "@/server/db/prisma";
import { isAdminOrOwner, canManageFinance, canManageHR, ForbiddenException } from "@/server/tenancy/context";

interface RouteParams {
  params: Promise<{ fileId: string }>;
}

async function resolveContext(req: NextRequest, workspaceSlug: string) {
  let ctx = await getCurrentTenantContext(workspaceSlug).catch(() => null);
  if (ctx) return ctx;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const token = authHeader || cookieVal;
  if (token) {
    return await resolveSessionAndTenant(token, workspaceSlug).catch(() => null);
  }
  return null;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await resolveContext(req, workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const isPrivileged = isAdminOrOwner(ctx);
    let isSensitiveHR = false;

    // 0. Verify file exists in tenant
    const fileRecord = await prisma.privateFile.findFirst({
      where: { id: fileId, tenantId: ctx.tenantId },
    });

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found in this studio workspace." }, { status: 404 });
    }

    // 1. Check if file is associated with a DocumentVersion (drawing)
    const documentVersion = await prisma.documentVersion.findFirst({
      where: { fileId, tenantId: ctx.tenantId },
      include: { document: { select: { projectId: true } } },
    });

    if (documentVersion && !isPrivileged) {
      // Must be an assigned project member
      const isMember = await prisma.projectMember.findFirst({
        where: {
          tenantId: ctx.tenantId,
          projectId: documentVersion.document.projectId,
          membershipId: ctx.membershipId,
        },
      });
      if (!isMember) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project to view its drawing files." },
          { status: 403 }
        );
      }
    }

    // 2. Check if file is associated with a Quotation (commercial file)
    const quotation = await prisma.quotation.findFirst({
      where: { privateFileId: fileId, tenantId: ctx.tenantId },
    });

    if (quotation && !canManageFinance(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Access to commercial quotation files requires project finance permissions." },
        { status: 403 }
      );
    }

    // 2b. Check FeePayment / Expense receipts (financial files)
    const feeReceipt = await prisma.feePayment.findFirst({
      where: { receiptFileId: fileId, tenantId: ctx.tenantId },
    });
    const expenseReceipt = await prisma.expense.findFirst({
      where: { receiptFileId: fileId, tenantId: ctx.tenantId },
    });

    if ((feeReceipt || expenseReceipt) && !canManageFinance(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Access to payment and expense receipts requires finance permissions." },
        { status: 403 }
      );
    }

    // 2c. Check StudioLeaveRequest supporting file (medical certificates / sensitive leave proof)
    const leaveReq = await prisma.studioLeaveRequest.findFirst({
      where: { supportingFileId: fileId, tenantId: ctx.tenantId },
      include: { employee: true },
    });

    if (leaveReq) {
      isSensitiveHR = true;
      const isOwnLeave = ctx.employeeId && ctx.employeeId === leaveReq.employee?.employeeId;
      const hasHRPermission = canManageHR(ctx);
      if (!isOwnLeave && !hasHRPermission) {
        return NextResponse.json(
          { error: "Forbidden: Leave supporting documents require employee ownership or HR permissions." },
          { status: 403 }
        );
      }
    }

    // 3. Check EmployeeDocument (sensitive HR file)
    const employeeDoc = await prisma.employeeDocument.findFirst({
      where: { privateFileId: fileId, tenantId: ctx.tenantId },
      include: { employee: true },
    });

    if (employeeDoc) {
      isSensitiveHR = true;
      const isOwnDocument = ctx.employeeId && ctx.employeeId === employeeDoc.employee.employeeId;
      const hasHRPermission = canManageHR(ctx);

      if (!isOwnDocument && !hasHRPermission) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to access another employee's confidential documents." },
          { status: 403 }
        );
      }

      if (employeeDoc.scanStatus === "QUARANTINED" || employeeDoc.scanStatus === "UNSCANNED") {
        return NextResponse.json(
          { error: "File is quarantined pending security scanning and content verification." },
          { status: 403 }
        );
      }

      if (employeeDoc.scanStatus === "INFECTED") {
        return NextResponse.json(
          { error: "Access denied: File failed antivirus verification and is permanently quarantined." },
          { status: 403 }
        );
      }
    }

    // 4. Check IssuedLetter (formal HR letter)
    const issuedLetter = await prisma.issuedLetter.findFirst({
      where: { renderedPdfFileId: fileId, tenantId: ctx.tenantId },
      include: { employee: true },
    });

    if (issuedLetter) {
      isSensitiveHR = true;
      const isOwnLetter = ctx.employeeId && ctx.employeeId === issuedLetter.employee.employeeId;
      const hasHRPermission = canManageHR(ctx);

      if (!isOwnLetter && !hasHRPermission) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to access another employee's HR letters." },
          { status: 403 }
        );
      }
    }

    // 5. Unassociated / Orphaned files authorization:
    // General Admin fallback MUST NOT bypass sensitive-file protections!
    const isAssociated = Boolean(
      documentVersion || quotation || feeReceipt || expenseReceipt || leaveReq || employeeDoc || issuedLetter
    );

    if (!isAssociated) {
      const isUploader = fileRecord.uploaderId === ctx.membershipId;
      const isOwner = ctx.role === "OWNER";

      if (!isUploader && !isOwner) {
        // If an Admin tries to access an unassociated or orphaned file uploaded by someone else:
        const uploaderEmployee = await prisma.employee.findFirst({
          where: { tenantId: ctx.tenantId, membershipId: fileRecord.uploaderId },
        });

        const isHrTagged = Boolean(
          uploaderEmployee ||
          /medical|aadhaar|pan|resume|salary|kyc|identity|contract|passport/i.test(fileRecord.fileName)
        );

        if (isHrTagged) {
          isSensitiveHR = true;
          if (!canManageHR(ctx)) {
            return NextResponse.json(
              {
                error:
                  "Forbidden: General administrator accounts without explicit HR authorization cannot access unassociated or employee-uploaded sensitive files.",
              },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Forbidden: You do not have permission to access unassociated files uploaded by another user." },
            { status: 403 }
          );
        }
      }
    }

    // 6. Read and stream file safely
    const file = await readPrivateFile(ctx, fileId);

    const isDownload = searchParams.get("download") === "true";
    const disposition = isDownload ? "attachment" : "inline";

    const cacheHeader = isSensitiveHR
      ? "private, no-cache, no-store, must-revalidate"
      : "private, no-transform, max-age=3600";

    const headers: Record<string, string> = {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(file.byteSize),
      "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
      "Cache-Control": cacheHeader,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    };

    if (isSensitiveHR) {
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("GET /api/storage/files/[fileId] error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 404;
    return NextResponse.json({ error: err.message || "File unavailable" }, { status });
  }
}
