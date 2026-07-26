import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

export default async function ProjectSettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string; workspaceId: string; projectId: string }>;
}) {
  const { locale, workspaceId, projectId } = await params;
  setRequestLocale(locale);
  return redirect({
    href: `/app/w/${workspaceId}/p/${projectId}/settings/general`,
    locale,
  });
}
