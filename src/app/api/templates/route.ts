import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  listProjectTemplates,
  getProjectTemplate,
  createProjectTemplate,
  previewApplyTemplate,
  applyTemplateToProject,
} from "@/server/modules/projects/templates";

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

    const templateId = searchParams.get("templateId");
    if (templateId) {
      const template = await getProjectTemplate(ctx, templateId);
      return NextResponse.json({ template });
    }

    const status = searchParams.get("status") || undefined;
    const projectType = searchParams.get("projectType") || undefined;

    const templates = await listProjectTemplates(ctx, { status, projectType });
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load project templates" },
      { status: 500 }
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

    if (action === "PREVIEW") {
      const { templateId, projectId, startDate, roleMapping } = body;
      if (!templateId || !projectId || !startDate) {
        return NextResponse.json(
          { error: "templateId, projectId, and startDate are required for preview." },
          { status: 400 }
        );
      }
      const preview = await previewApplyTemplate(ctx, {
        templateId,
        projectId,
        startDate,
        roleMapping,
      });
      return NextResponse.json({ success: true, preview });
    }

    if (action === "APPLY") {
      const { templateId, projectId, startDate, roleMapping, confirmationNotes } = body;
      if (!templateId || !projectId || !startDate) {
        return NextResponse.json(
          { error: "templateId, projectId, and startDate are required to apply template." },
          { status: 400 }
        );
      }
      const result = await applyTemplateToProject(ctx, {
        templateId,
        projectId,
        startDate,
        roleMapping,
        confirmationNotes,
      });
      return NextResponse.json(result);
    }

    // Default: create new template
    const template = await createProjectTemplate(ctx, {
      name: body.name,
      projectType: body.projectType,
      description: body.description,
      category: body.category,
      phases: body.phases,
      deliverables: body.deliverables,
      dependencies: body.dependencies,
      status: body.status,
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process template request" },
      { status: err.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
