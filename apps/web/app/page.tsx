import { redirect } from "next/navigation";

import { SignedOutShell } from "@/components/auth/signed-out-shell";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <SignedOutShell />
    </main>
  );
}
