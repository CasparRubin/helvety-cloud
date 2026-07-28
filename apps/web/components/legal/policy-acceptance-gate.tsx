"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  CURRENT_POLICY_VERSIONS,
  SIGNUP_POLICY_HREFS,
  SIGNUP_POLICY_IDS,
  type SignupPolicyId,
} from "@/lib/legal/policies";
import { putMePolicyAcceptances } from "@/lib/api/v1-client";

const GATE_LABELS: Record<
  SignupPolicyId,
  { prefix: string; linkText: string; suffix?: string }
> = {
  tos: {
    prefix: "I accept the",
    linkText: "Terms of Service",
  },
  privacy: {
    prefix: "I accept the",
    linkText: "Privacy Policy",
  },
  aup: {
    prefix: "I accept the",
    linkText: "Acceptable Use Policy",
  },
  e2ee: {
    prefix: "I acknowledge the",
    linkText: "E2EE / zero-access notice",
    suffix:
      "Helvety cannot decrypt or recover your data; lost keys mean permanent loss; I am responsible for my content and keys.",
  },
  eligibility: {
    prefix: "I confirm",
    linkText: "geographic eligibility",
    suffix:
      "I am not located in the EU/EEA and am not using Helvety Cloud on behalf of a person or entity located there.",
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
    eligibility: false,
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
        err instanceof Error
          ? err.message
          : "Failed to record policy acceptance",
      );
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Accept policies to continue</p>
        <p className="text-xs text-muted-foreground">
          Acceptance is logged with policy version and timestamp before
          encryption setup. Linked documents open on helvety.com in a new tab.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SIGNUP_POLICY_IDS.map((id) => {
          const meta = GATE_LABELS[id];
          const href = SIGNUP_POLICY_HREFS[id];
          const inputId = `policy-${id}`;
          const showSuffix = Boolean(meta.suffix);

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
                {meta.prefix}{" "}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {meta.linkText}
                </a>{" "}
                <span className="text-muted-foreground">
                  ({CURRENT_POLICY_VERSIONS[id]})
                </span>
                {showSuffix && meta.suffix ? (
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {meta.suffix}
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
        Record acceptance and continue
      </Button>
    </div>
  );
}
