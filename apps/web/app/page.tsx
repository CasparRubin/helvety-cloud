import { redirect } from "next/navigation";

import { SignedOutShell } from "@/components/auth/signed-out-shell";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ "account-deleted"?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const { "account-deleted": accountDeleted } = await searchParams;

  return <SignedOutShell accountDeleted={accountDeleted === "1"} />;
}
