import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { readPrivateFile } from "@/server/storage/storage-adapter";
import { prisma } from "@/server/db/prisma";
import { isAdminOrOwner, canManageFinance, ForbiddenException } from "@/server/tenancy/context";

interface RouteParams {
  params: Promise<{ fileId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const isPrivileged = isAdminOrOwner(ctx);

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

    // 3. Read and stream file safely
    const file = await readPrivateFile(ctx, fileId);

    const isDownload = searchParams.get("download") === "true";
    const disposition = isDownload ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(file.byteSize),
        "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("GET /api/storage/files/[fileId] error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 404;
    return NextResponse.json({ error: err.message || "File unavailable" }, { status });
  }
}
