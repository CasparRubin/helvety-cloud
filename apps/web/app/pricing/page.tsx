import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CAPACITY_PACK, PLAN_LIMITS, formatBytes } from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing · Helvety Cloud",
  description:
    "Compare Free, Pro Workspace, and Capacity Increase limits for Helvety Cloud.",
};

type PricingRow = {
  label: string;
  value: string;
};

const freeRows: PricingRow[] = [
  { label: "Projects", value: String(PLAN_LIMITS.free.projectsPerWorkspace) },
  { label: "Members", value: String(PLAN_LIMITS.free.membersPerWorkspace) },
  { label: "Tasks per project", value: String(PLAN_LIMITS.free.tasksPerProject) },
  { label: "Notes", value: String(PLAN_LIMITS.free.notesPerWorkspace) },
  { label: "Contacts", value: String(PLAN_LIMITS.free.contactsPerWorkspace) },
  { label: "Files per task", value: "Not included" },
  { label: "Encrypted file storage", value: "Not included" },
];

const proRows: PricingRow[] = [
  { label: "Projects", value: String(PLAN_LIMITS.pro.projectsPerWorkspace) },
  { label: "Members", value: String(PLAN_LIMITS.pro.membersPerWorkspace) },
  { label: "Tasks per project", value: String(PLAN_LIMITS.pro.tasksPerProject) },
  { label: "Notes", value: String(PLAN_LIMITS.pro.notesPerWorkspace) },
  { label: "Contacts", value: String(PLAN_LIMITS.pro.contactsPerWorkspace) },
  { label: "Files per task", value: String(PLAN_LIMITS.pro.filesPerTask) },
  {
    label: "Encrypted file storage",
    value: formatBytes(PLAN_LIMITS.pro.storageBytesPerWorkspace),
  },
  {
    label: "Max upload size",
    value: formatBytes(PLAN_LIMITS.pro.maxUploadBytes),
  },
];

const capacityRows: PricingRow[] = [
  { label: "Projects", value: `+${CAPACITY_PACK.deltas.projects}` },
  { label: "Tasks per project", value: `+${CAPACITY_PACK.deltas.tasksPerProject}` },
  { label: "Notes", value: `+${CAPACITY_PACK.deltas.notes}` },
  { label: "Contacts", value: `+${CAPACITY_PACK.deltas.contacts}` },
  { label: "Seats", value: `+${CAPACITY_PACK.deltas.members}` },
  {
    label: "Encrypted file storage",
    value: `+${formatBytes(CAPACITY_PACK.deltas.storageBytes)}`,
  },
  { label: "Files per task", value: `+${CAPACITY_PACK.deltas.filesPerTask}` },
];

function PricingCard({
  title,
  subtitle,
  eyebrow,
  rows,
  highlight = false,
  footer,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  rows: PricingRow[];
  highlight?: boolean;
  footer: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "h-full ring-1 ring-foreground/10",
        highlight && "ring-2 ring-foreground/20",
      )}
    >
      <CardHeader className="gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            {subtitle}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b border-border/70 pb-3 last:border-b-0 last:pb-0"
            >
              <dt className="text-sm text-foreground/90">{row.label}</dt>
              <dd className="text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="items-start">
        <p className="text-sm leading-relaxed text-muted-foreground">{footer}</p>
      </CardFooter>
    </Card>
  );
}

function CtaLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/85"
          : "border border-border bg-background hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground">Pricing</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple workspace pricing.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Helvety Cloud keeps billing straightforward: start on Free, upgrade a
            workspace to Pro Workspace when you need encrypted files and higher
            limits, then add Capacity Increase packs if that workspace grows.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <PricingCard
            eyebrow="No card"
            title="Free"
            subtitle="For personal use and early workspace setup."
            rows={freeRows}
            footer={
              <>
                Includes up to two owned free-tier workspaces per account,
                including your Personal workspace.
              </>
            }
          />
          <PricingCard
            eyebrow="Workspace subscription"
            title="Pro Workspace"
            subtitle="Higher limits plus encrypted file and document storage."
            rows={proRows}
            highlight
            footer={
              <>
                Billed yearly. Pricing, discounts, taxes, and renewals are shown
                at checkout and in the billing portal.
              </>
            }
          />
          <PricingCard
            eyebrow="Optional add-on"
            title="Capacity Increase"
            subtitle="One extra bundle of capacity for a paid Pro Workspace."
            rows={capacityRows}
            footer={
              <>
                Buy as many packs as you need. Each pack raises all listed limits
                together on the same workspace.
              </>
            }
          />
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-medium tracking-tight">
                Billing stays honest
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Helvety never sends encryption keys or encrypted plaintext to
                Stripe. Limits, renewals, discounts, and billing terms are shown
                clearly before payment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CtaLink href="/login" primary>
                Start with Free
              </CtaLink>
              <CtaLink href="/legal/billing">See billing terms</CtaLink>
            </div>
          </div>
        </section>

        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            Back to Helvety Cloud
          </Link>
        </footer>
      </div>
    </main>
  );
}
