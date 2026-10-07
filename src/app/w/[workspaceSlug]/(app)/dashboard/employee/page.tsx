import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getEmployeeDashboardData } from "@/server/modules/dashboard/service";
import EmployeeDashboardView from "./EmployeeDashboardView";

interface EmployeeDashboardPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function EmployeeDashboardPage({ params }: EmployeeDashboardPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Fetch employee-scoped personal dashboard data
  const data = await getEmployeeDashboardData(ctx);

  return (
    <EmployeeDashboardView
      data={data}
      workspaceSlug={workspaceSlug}
      userRole={ctx.role}
      userFullName={ctx.userFullName || "Team Member"}
      membershipId={ctx.membershipId}
      timezone={ctx.timezone}
    />
  );
}
