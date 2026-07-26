"use client";

import { useTranslations } from "next-intl";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function SignedOutShell({
  accountDeleted = false,
}: {
  accountDeleted?: boolean;
}) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  return (
    <AuthShell
      title={accountDeleted ? t("accountDeleted") : t("privateByDesign")}
      subtitle={
        accountDeleted ? (
          t("accountDeletedSubtitle")
        ) : (
          t.rich("subtitle", {
            github: (chunks) => (
              <a
                href="https://github.com/CasparRubin/helvety-cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {chunks}
              </a>
            ),
          })
        )
      }
      footer={
        <>
          <Link href="/legal" className="underline underline-offset-4">
            {tCommon("legal")}
          </Link>
          {" · "}
          {t.rich("billingLimits", {
            billing: (chunks) => (
              <Link href="/legal/billing" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </>
      }
    >
      {accountDeleted ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            {t("oneMoreStep")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t("removePasskey")}</li>
            <li>
              {t.rich("deleteRecovery", {
                file: () => (
                  <code className="text-[11px]">helvety-recovery.json</code>
                ),
              })}
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("cannotInspectPasskeys")}
          </p>
        </div>
      ) : null}
      <Button
        render={<Link href="/login" />}
        nativeButton={false}
        className="w-full"
      >
        {accountDeleted ? t("backToSignIn") : t("joinForFree")}
      </Button>
    </AuthShell>
  );
}
