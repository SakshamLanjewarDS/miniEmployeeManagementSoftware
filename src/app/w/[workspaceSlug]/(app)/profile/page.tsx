import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getProfileOverview } from "@/server/modules/profile/service";
import { ProfileClientView } from "./ProfileClientView";

interface ProfilePageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ memberId?: string }>;
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { workspaceSlug } = await params;
  const search = searchParams ? await searchParams : {};
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const rawOverview = await getProfileOverview(ctx, search?.memberId);

  // Clean JSON serialization for Next.js Server Components -> Client Components
  const serializedOverview = JSON.parse(JSON.stringify(rawOverview));

  return (
    <ProfileClientView
      context={ctx}
      initialData={serializedOverview}
    />
  );
}
