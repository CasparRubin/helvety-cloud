import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function ProjectStagesSettingsPage({ params }: PageProps) {
  const { workspaceId } = await params;
  redirect(`/app/w/${workspaceId}/settings/stages`);
}
