import { setRequestLocale } from "next-intl/server";

import { SignedOutShell } from "@/components/auth/signed-out-shell";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ "account-deleted"?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect({ href: "/app", locale });
  }

  const { "account-deleted": accountDeleted } = await searchParams;

  return <SignedOutShell accountDeleted={accountDeleted === "1"} />;
}
