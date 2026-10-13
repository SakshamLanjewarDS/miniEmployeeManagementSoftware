import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/tenancy/context";
import { listProjectRFIs, createProjectRFI } from "@/server/modules/rfis/service";

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const drawingVersionId = searchParams.get("drawingVersionId") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listProjectRFIs(context, {
      projectId,
      drawingVersionId,
      status,
      priority,
      search,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to load RFIs" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.projectId || !body.title || !body.question) {
      return NextResponse.json(
        { error: "Project ID, title, and question are required" },
        { status: 400 }
      );
    }

    const rfi = await createProjectRFI(context, {
      projectId: body.projectId,
      title: body.title,
      question: body.question,
      drawingVersionId: body.drawingVersionId,
      siteLocation: body.siteLocation,
      priority: body.priority,
      dueDate: body.dueDate,
      relatedContractorId: body.relatedContractorId,
      evidenceFiles: body.evidenceFiles,
    });

    return NextResponse.json(rfi, { status: 201 });
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to create RFI" },
      { status }
    );
  }
}
