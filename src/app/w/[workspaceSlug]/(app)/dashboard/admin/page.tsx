import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getAdminDashboardData } from "@/server/modules/dashboard/service";
import AdminDashboardView from "./AdminDashboardView";

interface AdminDashboardPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Block employees from admin management dashboard
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
    redirect(`/w/${workspaceSlug}/dashboard/employee`);
  }

  const data = await getAdminDashboardData(ctx);

  return (
    <AdminDashboardView
      data={data}
      workspaceSlug={workspaceSlug}
      userRole={ctx.role}
      userFullName={ctx.userFullName || "Studio Administrator"}
      timezone={ctx.timezone}
    />
  );
}
