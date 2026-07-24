"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  CURRENT_POLICY_VERSIONS,
  LEGAL_DOC_META,
  SIGNUP_POLICY_IDS,
  type SignupPolicyId,
} from "@/lib/legal/policies";
import { putMePolicyAcceptances } from "@/lib/api/v1-client";

const GATE_LABELS: Record<
  SignupPolicyId,
  { prefix: string; linkText: string; suffix?: string; docSlug: keyof typeof LEGAL_DOC_META }
> = {
  tos: {
    prefix: "I accept the",
    linkText: "Terms of Service",
    docSlug: "terms",
  },
  privacy: {
    prefix: "I accept the",
    linkText: "Privacy Policy",
    docSlug: "privacy",
  },
  aup: {
    prefix: "I accept the",
    linkText: "Acceptable Use Policy",
    docSlug: "aup",
  },
  e2ee: {
    prefix: "I acknowledge the",
    linkText: "E2EE / zero-access notice",
    suffix:
      ": Helvety cannot decrypt or recover vault content; lost keys mean permanent loss; I am responsible for my content and keys.",
    docSlug: "e2ee",
  },
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
        err instanceof Error ? err.message : "Failed to record policy acceptance",
      );
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Accept policies to continue</p>
        <p className="text-xs text-muted-foreground">
          Acceptance is logged with policy version and timestamp before vault
          setup. Open each linked document to read it.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SIGNUP_POLICY_IDS.map((id) => {
          const meta = GATE_LABELS[id];
          const href = LEGAL_DOC_META[meta.docSlug].href;
          const inputId = `policy-${id}`;
          return (
            <div key={id} className="flex items-start gap-3">
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
              <Label htmlFor={inputId} className="text-sm leading-snug font-normal">
                {meta.prefix}{" "}
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {meta.linkText}
                </a>
                {meta.suffix ?? ""}{" "}
                <span className="text-muted-foreground">
                  ({CURRENT_POLICY_VERSIONS[id]})
                </span>
              </Label>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        disabled={pending || !allChecked}
        onClick={() => void submit()}
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Record acceptance and continue
      </Button>
    </div>
  );
}
