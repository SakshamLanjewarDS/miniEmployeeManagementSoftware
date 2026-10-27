import React from "react";
import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { canManageHR } from "@/server/tenancy/context";
import { listEmployeesService } from "@/server/modules/employees/service";
import { getLetterTemplates } from "@/server/modules/letters/service";
import { getAllEmployeesDocumentRecords } from "@/server/modules/documents/service";
import { serializeForClient } from "@/server/utils/serialize";
import HiringClientView from "./HiringClientView";

interface HiringPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function HiringPage({ params }: HiringPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Strict role enforcement: Only Studio Administrator or Owner can access Hiring & Records Studio
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
    redirect(`/w/${workspaceSlug}/team`);
  }

  let employees: any[] = [];
  let templates: any[] = [];
  let documentRecords: any[] = [];

  try {
    employees = await listEmployeesService(ctx);
  } catch (err) {
    console.error("[HiringPage] Failed to load employees:", err);
  }

  try {
    templates = await getLetterTemplates(ctx);
  } catch (err) {
    console.error("[HiringPage] Failed to load letter templates:", err);
  }

  if (canManageHR(ctx)) {
    try {
      documentRecords = await getAllEmployeesDocumentRecords(ctx);
    } catch (err) {
      console.error("[HiringPage] Failed to load employee document records:", err);
    }
  }

  return (
    <HiringClientView
      workspaceSlug={ctx.tenantSlug}
      context={serializeForClient(ctx)}
      employees={serializeForClient(employees) as any}
      templates={serializeForClient(templates) as any}
      initialDocumentRecords={serializeForClient(documentRecords) as any}
    />
  );
}
