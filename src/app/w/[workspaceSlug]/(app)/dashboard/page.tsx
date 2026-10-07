import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";

interface DashboardPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Server-side default landing page resolution based on trusted session context:
  // - OWNER -> Owner Dashboard
  // - ADMIN -> Admin Dashboard
  // - EMPLOYEE -> Employee Dashboard
  if (ctx.role === "OWNER") {
    redirect(`/w/${workspaceSlug}/dashboard/owner`);
  } else if (ctx.role === "ADMIN") {
    redirect(`/w/${workspaceSlug}/dashboard/admin`);
  } else {
    redirect(`/w/${workspaceSlug}/dashboard/employee`);
  }
}
