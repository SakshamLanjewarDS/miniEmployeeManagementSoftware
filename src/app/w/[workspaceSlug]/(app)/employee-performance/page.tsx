import { notFound, redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { PerformanceClientView } from "./PerformanceClientView";

interface PerformancePageProps {
  params: Promise<{
    workspaceSlug: string;
  }>;
}

export default async function EmployeePerformancePage({ params }: PerformancePageProps) {
  const { workspaceSlug } = await params;
  const context = await getCurrentTenantContext(workspaceSlug);

  if (!context) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  // Server-side authorization gate: strictly OWNER or ADMIN only
  if (context.role !== "OWNER" && context.role !== "ADMIN") {
    notFound();
  }

  return <PerformanceClientView context={context} />;
}
