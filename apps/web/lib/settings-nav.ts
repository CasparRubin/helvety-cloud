export type SettingsNavItem = {
  href: string;
  label: string;
  destructive?: boolean;
};

export type SettingsNavLabel =
  | "general"
  | "members"
  | "billing"
  | "danger"
  | "taskStages"
  | "taskLabels"
  | "taskPriorities"
  | "import";

export type SettingsNavTranslate = (key: SettingsNavLabel) => string;

export function projectSettingsNavItems(
  workspaceId: string,
  projectId: string,
  t: SettingsNavTranslate,
): SettingsNavItem[] {
  const base = `/app/w/${workspaceId}/p/${projectId}/settings`;
  return [
    { href: `${base}/general`, label: t("general") },
    { href: `${base}/stages`, label: t("taskStages") },
    { href: `${base}/labels`, label: t("taskLabels") },
    { href: `${base}/priorities`, label: t("taskPriorities") },
    { href: `${base}/import`, label: t("import") },
    { href: `${base}/danger`, label: t("danger"), destructive: true },
  ];
}

export function workspaceSettingsNavItems(
  workspaceId: string,
  t: SettingsNavTranslate,
  opts?: { showDanger?: boolean },
): SettingsNavItem[] {
  const base = `/app/w/${workspaceId}/settings`;
  const items: SettingsNavItem[] = [
    { href: `${base}/general`, label: t("general") },
    { href: `${base}/members`, label: t("members") },
    { href: `${base}/billing`, label: t("billing") },
  ];
  if (opts?.showDanger !== false) {
    items.push({
      href: `${base}/danger`,
      label: t("danger"),
      destructive: true,
    });
  }
  return items;
}

export function accountSettingsNavItems(
  t: SettingsNavTranslate,
): SettingsNavItem[] {
  return [
    { href: "/app/account/general", label: t("general") },
    {
      href: "/app/account/danger",
      label: t("danger"),
      destructive: true,
    },
  ];
}
