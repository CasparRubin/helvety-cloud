import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function ProjectLabelsSettingsPage({ params }: PageProps) {
  const { workspaceId } = await params;
  redirect(`/app/w/${workspaceId}/settings/labels`);
}
