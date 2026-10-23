import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
} from "@/server/modules/documents/service";
import { EmployeeDocumentCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const employeeId = searchParams.get("employeeId");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Default to current logged-in employee if employeeId not specified
    const targetEmployeeId = employeeId || ctx.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "No employee profile linked to current account" }, { status: 400 });
    }

    const result = await getEmployeeDocuments(ctx, targetEmployeeId);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to load documents" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const employeeId = searchParams.get("employeeId");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetEmployeeId = employeeId || ctx.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "No employee ID provided" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as EmployeeDocumentCategory | null;
    const title = (formData.get("title") as string) || "Employee Document";
    const maskedNumber = formData.get("maskedNumber") as string | null;
    const degreeName = formData.get("degreeName") as string | null;
    const bankLast4 = formData.get("bankLast4") as string | null;

    if (!file || !category) {
      return NextResponse.json({ error: "Missing required file or category" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const doc = await uploadEmployeeDocument(ctx, targetEmployeeId, {
      category,
      title,
      file: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        buffer,
      },
      metadata: {
        maskedNumber: maskedNumber || undefined,
        degreeName: degreeName || undefined,
        bankLast4: bankLast4 || undefined,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Upload failed" }, { status });
  }
}
