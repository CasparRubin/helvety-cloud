import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

export default async function AccountIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return redirect({ href: "/app/account/general", locale });
}
