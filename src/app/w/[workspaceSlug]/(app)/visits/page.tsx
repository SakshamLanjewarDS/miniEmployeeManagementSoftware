import { redirect } from "next/navigation";

interface VisitsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function VisitsPage({ params }: VisitsPageProps) {
  const { workspaceSlug } = await params;
  redirect(`/w/${workspaceSlug}/tasks?tab=visits`);
}
