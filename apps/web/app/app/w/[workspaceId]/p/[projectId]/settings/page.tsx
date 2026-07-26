import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export default async function ProjectSettingsIndexPage({ params }: PageProps) {
  const { workspaceId, projectId } = await params;
  redirect(`/app/w/${workspaceId}/p/${projectId}/settings/general`);
}
