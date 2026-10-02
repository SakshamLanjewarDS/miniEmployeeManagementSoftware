import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectFormData,
  findProjects,
  updateProjectProgress,
} from "@/server/modules/projects/repository";

// GET /api/projects?workspaceSlug=...&type=formData | list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const type = searchParams.get("type");

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (type === "formData") {
      const formData = await getProjectFormData(ctx);
      return NextResponse.json(formData);
    }

    const projects = await findProjects(ctx);
    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch project data" }, { status: 500 });
  }
}

// POST /api/projects?workspaceSlug=... (Owner and Admin only)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can create projects." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      primaryClientId,
      projectType,
      siteAddress,
      siteCity,
      googleMapLocation,
      projectManagerId,
      projectCoordinatorId,
      contractorId,
      consultantId,
      plotArea,
      constructionArea,
      budget,
      currency,
      startDate,
      targetDate,
    } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Project code is required (e.g. PRJ-101)" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await createProject(ctx, {
      code: code.trim(),
      name: name.trim(),
      description: description?.trim() || undefined,
      primaryClientId: primaryClientId || undefined,
      projectType: projectType || undefined,
      siteAddress: siteAddress?.trim() || undefined,
      siteCity: siteCity?.trim() || undefined,
      googleMapLocation: googleMapLocation?.trim() || undefined,
      projectManagerId: projectManagerId || undefined,
      projectCoordinatorId: projectCoordinatorId || undefined,
      contractorId: contractorId || undefined,
      consultantId: consultantId || undefined,
      plotArea: plotArea?.trim() || undefined,
      constructionArea: constructionArea?.trim() || undefined,
      budget: budget ? Number(budget) : undefined,
      currency: currency || ctx.currency || "INR",
      startDate: startDate ? new Date(startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: error.status || 400 }
    );
  }
}

// PATCH /api/projects?workspaceSlug=... (Owner and Admin only)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can modify projects." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { projectId, ...updates } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const updated = await updateProject(ctx, projectId, {
      code: updates.code,
      name: updates.name,
      description: updates.description,
      primaryClientId: updates.primaryClientId,
      projectType: updates.projectType,
      siteAddress: updates.siteAddress,
      siteCity: updates.siteCity,
      googleMapLocation: updates.googleMapLocation,
      projectManagerId: updates.projectManagerId,
      projectCoordinatorId: updates.projectCoordinatorId,
      contractorId: updates.contractorId,
      consultantId: updates.consultantId,
      plotArea: updates.plotArea,
      constructionArea: updates.constructionArea,
      currentPhase: updates.currentPhase,
      status: updates.status,
      budget: updates.budget !== undefined ? (updates.budget ? Number(updates.budget) : null) : undefined,
      currency: updates.currency,
      startDate: updates.startDate ? new Date(updates.startDate) : updates.startDate === null ? null : undefined,
      targetDate: updates.targetDate ? new Date(updates.targetDate) : updates.targetDate === null ? null : undefined,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error("PATCH /api/projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update project" },
      { status: error.status || 400 }
    );
  }
}

// PUT /api/projects?workspaceSlug=... (Manipulate progress / advance phase - Owner and Admin only)
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can manipulate project progress." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { projectId, targetPhaseName, phaseUpdates, status } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const updated = await updateProjectProgress(ctx, projectId, {
      targetPhaseName,
      phaseUpdates,
      status,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error("PUT /api/projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to manipulate project progress" },
      { status: error.status || 400 }
    );
  }
}

// DELETE /api/projects?workspaceSlug=...&projectId=... (Owner and Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const projectId = searchParams.get("projectId");

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can delete projects." },
        { status: 403 }
      );
    }

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    await deleteProject(ctx, projectId);
    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: error.status || 400 }
    );
  }
}
