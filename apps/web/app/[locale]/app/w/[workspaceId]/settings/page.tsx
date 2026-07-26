import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

export default async function WorkspaceSettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string; workspaceId: string }>;
}) {
  const { locale, workspaceId } = await params;
  setRequestLocale(locale);
  return redirect({
    href: `/app/w/${workspaceId}/settings/general`,
    locale,
  });
}
