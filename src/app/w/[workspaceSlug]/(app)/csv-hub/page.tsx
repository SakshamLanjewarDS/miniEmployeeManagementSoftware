import { redirect } from "next/navigation";

interface CsvHubPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function CsvHubPage({ params }: CsvHubPageProps) {
  const { workspaceSlug } = await params;
  redirect(`/w/${workspaceSlug}/projects`);
}
