import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);

  if (!ctx) {
    redirect(`/w/${workspaceSlug}/login`);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex">
      {/* Top Instant Navigation Progress Bar */}
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>

      {/* Sidebar */}
      <AppSidebar context={ctx} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar context={ctx} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
