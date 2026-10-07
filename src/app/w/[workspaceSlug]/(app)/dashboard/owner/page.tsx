import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getOwnerDashboardData } from "@/server/modules/dashboard/service";
import OwnerDashboardView from "./OwnerDashboardView";

interface OwnerDashboardPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function OwnerDashboardPage({ params }: OwnerDashboardPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Block employees from management dashboard views
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    redirect(`/w/${workspaceSlug}/dashboard/employee`);
  }

  const data = await getOwnerDashboardData(ctx);

  return (
    <OwnerDashboardView
      data={data}
      workspaceSlug={workspaceSlug}
      userRole={ctx.role}
      userFullName={ctx.userFullName || "Principal Architect"}
      timezone={ctx.timezone}
    />
  );
}
