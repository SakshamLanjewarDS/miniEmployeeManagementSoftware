import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/auth/session";
import { listMaterialSamples, submitMaterialSample } from "@/server/modules/materials/service";

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listMaterialSamples(context, { projectId, status, search });
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to load material samples" },
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
    if (!body.projectId || !body.materialName || !body.specificationDetails) {
      return NextResponse.json(
        { error: "Project ID, material name, and specifications are required" },
        { status: 400 }
      );
    }

    const sample = await submitMaterialSample(context, {
      projectId: body.projectId,
      materialName: body.materialName,
      manufacturerOrVendor: body.manufacturerOrVendor,
      specificationDetails: body.specificationDetails,
      proposedLocation: body.proposedLocation,
      drawingVersionId: body.drawingVersionId,
      contractorId: body.contractorId,
      samplePhotos: body.samplePhotos,
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to submit material sample" },
      { status }
    );
  }
}
