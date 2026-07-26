import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app/app-shell";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return redirect({ href: "/login", locale });
  }

  return (
    <AppShell email={user.email} userId={user.id}>
      {children}
    </AppShell>
  );
}
