"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";
import {
  CURRENT_POLICY_VERSIONS,
  LEGAL_DOC_META,
  SIGNUP_POLICY_IDS,
  type SignupPolicyId,
} from "@/lib/legal/policies";
import { putMePolicyAcceptances } from "@/lib/api/v1-client";

const GATE_DOCS: Record<
  SignupPolicyId,
  { linkKey: "terms" | "privacy" | "aup" | "e2ee"; docSlug: keyof typeof LEGAL_DOC_META }
> = {
  tos: { linkKey: "terms", docSlug: "terms" },
  privacy: { linkKey: "privacy", docSlug: "privacy" },
  aup: { linkKey: "aup", docSlug: "aup" },
  e2ee: { linkKey: "e2ee", docSlug: "e2ee" },
};

type PolicyAcceptanceGateProps = {
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onError: (message: string | null) => void;
  onAccepted: () => void;
};

export function PolicyAcceptanceGate({
  pending,
  onPendingChange,
  onError,
  onAccepted,
}: PolicyAcceptanceGateProps) {
  const t = useTranslations("policy");
  const tLegal = useTranslations("legalChrome");
  const [checked, setChecked] = useState<Record<SignupPolicyId, boolean>>({
    tos: false,
    privacy: false,
    aup: false,
    e2ee: false,
  });

  const allChecked = SIGNUP_POLICY_IDS.every((id) => checked[id]);

  async function submit() {
    onError(null);
    onPendingChange(true);
    try {
      await putMePolicyAcceptances({
        acceptances: SIGNUP_POLICY_IDS.map((policy) => ({
          policy,
          version: CURRENT_POLICY_VERSIONS[policy],
        })),
      });
      onAccepted();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : t("recordFailed"),
      );
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {SIGNUP_POLICY_IDS.map((id) => {
          const meta = GATE_DOCS[id];
          const href = LEGAL_DOC_META[meta.docSlug].href;
          const inputId = `policy-${id}`;
          const isE2ee = id === "e2ee";
          const prefix = isE2ee ? t("acknowledgePrefix") : t("acceptPrefix");

          return (
            <div key={id} className="flex min-w-0 items-start gap-3">
              <Checkbox
                id={inputId}
                checked={checked[id]}
                disabled={pending}
                onCheckedChange={(value) => {
                  setChecked((prev) => ({
                    ...prev,
                    [id]: value === true,
                  }));
                }}
              />
              <Label
                htmlFor={inputId}
                className="block min-w-0 flex-1 cursor-pointer text-sm leading-relaxed font-normal"
              >
                {prefix}{" "}
                <Link
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {tLegal(meta.linkKey)}
                </Link>{" "}
                <span className="text-muted-foreground">
                  ({CURRENT_POLICY_VERSIONS[id]})
                </span>
                {isE2ee ? (
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {t("e2eeSuffix")}
                  </span>
                ) : null}
              </Label>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={pending || !allChecked}
        onClick={() => void submit()}
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {t("continue")}
      </Button>
    </div>
  );
}
