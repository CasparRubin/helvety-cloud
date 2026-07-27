import Link from "next/link";
import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CAPACITY_PACK, PLAN_LIMITS, formatBytes } from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing · Helvety Cloud",
  description:
    "Compare Free Workspace, Pro Workspace, and Pro Workspace Capacity Increase limits for Helvety Cloud.",
};

type PricingRow = {
  label: string;
  value: string;
};

type PriceDisplay = {
  amount: string;
  currency?: string;
  suffix?: string;
};

type PricingTone = "free" | "pro" | "capacity";

const TONE_STYLES: Record<
  PricingTone,
  {
    card: string;
    eyebrow: string;
    amount: string;
    meta: string;
  }
> = {
  free: {
    card: "border-emerald-500/25 bg-emerald-50/50 ring-emerald-600/10 dark:bg-emerald-950/25 dark:ring-emerald-400/15",
    eyebrow: "text-emerald-700 dark:text-emerald-400",
    amount: "text-emerald-700 dark:text-emerald-400",
    meta: "text-emerald-700/70 dark:text-emerald-400/70",
  },
  pro: {
    card: "border-sky-500/25 bg-sky-50/50 ring-sky-600/10 dark:bg-sky-950/25 dark:ring-sky-400/15",
    eyebrow: "text-sky-700 dark:text-sky-400",
    amount: "text-sky-700 dark:text-sky-400",
    meta: "text-sky-700/70 dark:text-sky-400/70",
  },
  capacity: {
    card: "border-amber-500/25 bg-amber-50/45 ring-amber-600/10 dark:bg-amber-950/20 dark:ring-amber-400/15",
    eyebrow: "text-amber-800 dark:text-amber-400",
    amount: "text-amber-800 dark:text-amber-400",
    meta: "text-amber-800/70 dark:text-amber-400/70",
  },
};

const freeRows: PricingRow[] = [
  { label: "Projects", value: String(PLAN_LIMITS.free.projectsPerWorkspace) },
  { label: "Members", value: String(PLAN_LIMITS.free.membersPerWorkspace) },
  {
    label: "Tasks per project",
    value: String(PLAN_LIMITS.free.tasksPerProject),
  },
  { label: "Notes", value: String(PLAN_LIMITS.free.notesPerWorkspace) },
  { label: "Contacts", value: String(PLAN_LIMITS.free.contactsPerWorkspace) },
  {
    label: "Comments and replies",
    value: String(PLAN_LIMITS.free.commentsPerWorkspace),
  },
  { label: "Encrypted files per task", value: "Not included on Free" },
  { label: "Encrypted file storage", value: "Not included on Free" },
];

const proRows: PricingRow[] = [
  { label: "Projects", value: String(PLAN_LIMITS.pro.projectsPerWorkspace) },
  { label: "Members", value: String(PLAN_LIMITS.pro.membersPerWorkspace) },
  {
    label: "Tasks per project",
    value: String(PLAN_LIMITS.pro.tasksPerProject),
  },
  { label: "Notes", value: String(PLAN_LIMITS.pro.notesPerWorkspace) },
  { label: "Contacts", value: String(PLAN_LIMITS.pro.contactsPerWorkspace) },
  {
    label: "Comments and replies",
    value: String(PLAN_LIMITS.pro.commentsPerWorkspace),
  },
  {
    label: "Encrypted files per task",
    value: String(PLAN_LIMITS.pro.filesPerTask),
  },
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
  {
    label: "Tasks per project",
    value: `+${CAPACITY_PACK.deltas.tasksPerProject}`,
  },
  { label: "Notes", value: `+${CAPACITY_PACK.deltas.notes}` },
  { label: "Contacts", value: `+${CAPACITY_PACK.deltas.contacts}` },
  {
    label: "Comments and replies",
    value: `+${CAPACITY_PACK.deltas.comments}`,
  },
  { label: "Members", value: `+${CAPACITY_PACK.deltas.members}` },
  {
    label: "Encrypted file storage",
    value: `+${formatBytes(CAPACITY_PACK.deltas.storageBytes)}`,
  },
];

function PricingCard({
  title,
  subtitle,
  eyebrow,
  price,
  summary,
  rows,
  tone,
  footer,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  price: PriceDisplay;
  summary: string;
  rows: PricingRow[];
  tone: PricingTone;
  footer: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <Card className={cn("h-full border ring-1", styles.card)}>
      <CardHeader className="gap-4 border-b border-border/70 pb-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <p
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                styles.eyebrow,
              )}
            >
              {eyebrow}
            </p>
            <CardTitle className="text-xl font-semibold tracking-tight">
              {title}
            </CardTitle>
          </div>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <p
                className={cn(
                  "text-4xl font-semibold tracking-tight sm:text-5xl",
                  styles.amount,
                )}
              >
                {price.amount}
              </p>
              {price.currency || price.suffix ? (
                <p
                  className={cn(
                    "pb-1 text-xs font-medium tracking-wide uppercase",
                    styles.meta,
                  )}
                >
                  {[price.currency, price.suffix].filter(Boolean).join(" ")}
                </p>
              ) : null}
            </div>
            <p className="text-sm font-medium text-foreground">{summary}</p>
            <CardDescription className="leading-relaxed">
              {subtitle}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="mb-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Includes
          </p>
        </div>
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
      <CardFooter className="items-start border-t border-border/70 bg-muted/35">
        <p className="text-sm leading-relaxed text-muted-foreground">{footer}</p>
      </CardFooter>
    </Card>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
      {children}
    </li>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/80 p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex max-w-4xl flex-col gap-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Pricing</p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Private work stays simple. Billing does too.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start with a Free Workspace, upgrade a workspace to Pro Workspace
                when you need encrypted files and higher limits, then add Pro
                Workspace Capacity Increase packs only when that workspace grows.
                Workspace content (projects, tasks, notes, contacts, and names) is
                end-to-end encrypted on every plan, including Free. Helvety cannot
                decrypt it.
              </p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2">
            <TrustPoint>E2EE on every plan</TrustPoint>
            <TrustPoint>Email OTP only</TrustPoint>
            <TrustPoint>Passkey unlock</TrustPoint>
            <TrustPoint>No master key</TrustPoint>
          </ul>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <PricingCard
            tone="free"
            eyebrow="No card"
            title="Free Workspace"
            price={{ amount: "0", currency: "CHF" }}
            summary="One free workspace per user."
            subtitle="Your Personal workspace. Content is end-to-end encrypted, with fair-use limits and no file uploads."
            rows={freeRows}
            footer={
              <>
                Sign in to start. Billing is per workspace: each user gets one
                free workspace. Additional owned workspaces require Pro Workspace.
              </>
            }
          />
          <PricingCard
            tone="pro"
            eyebrow="Workspace subscription"
            title="Pro Workspace"
            price={{ amount: "250", currency: "CHF", suffix: "/ YEARLY" }}
            summary="One paid workspace, billed yearly."
            subtitle="Higher limits plus encrypted file and document storage."
            rows={proRows}
            footer={
              <>
                To upgrade your Free Workspace, open it, go to Workspace settings
                → Billing, and choose Upgrade to Pro. To add another workspace,
                use New Pro workspace (Checkout opens after create). Only the
                workspace owner can start checkout.
              </>
            }
          />
          <PricingCard
            tone="capacity"
            eyebrow="Optional add-on"
            title="Pro Workspace Capacity Increase"
            price={{ amount: "99", currency: "CHF", suffix: "/ YEARLY" }}
            summary="Per extra pack, billed yearly."
            subtitle="Additional room for a paid Pro Workspace."
            rows={capacityRows}
            footer={
              <>
                Requires an active Pro Workspace. Sign in as the workspace owner,
                open Workspace settings → Billing → Add-ons, then choose Add or
                change (opens the Stripe billing portal).
              </>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border border-border/80 bg-card/95 ring-1 ring-foreground/10">
            <CardHeader className="gap-2 border-b border-border/70">
              <CardTitle className="text-lg font-semibold tracking-tight">
                How billing works
              </CardTitle>
              <CardDescription className="max-w-2xl leading-relaxed">
                Billing is workspace-scoped. Free Workspace limits apply per
                workspace, Pro Workspace is yearly, and Pro Workspace Capacity
                Increase stacks on the workspace that needs more room.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
              <InfoBlock title="Workspace-scoped">
                One workspace can stay on Free while another is on Pro Workspace.
                Upgrades never silently change the rest of your account.
              </InfoBlock>
              <InfoBlock title="Where to buy">
                Upgrade a Free Workspace in Workspace settings → Billing, or
                create another workspace with New Pro workspace (Checkout opens
                after create). For Capacity Increase packs, owners use Add or
                change under Add-ons (Stripe billing portal).
              </InfoBlock>
              <InfoBlock title="Pro Workspace Capacity Increase">
                Pro Workspace Capacity Increase is an optional add-on for a paid Pro
                Workspace. Each extra pack adds the same bundle of limits again.
              </InfoBlock>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-muted/35 ring-1 ring-foreground/10">
            <CardHeader className="gap-2 border-b border-border/70">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Billing stays honest
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Helvety never sends encryption keys or encrypted plaintext to
                Stripe. Billing only uses operational counts and ciphertext size
                meters.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-5">
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className: "w-full",
                })}
              >
                Start with Free Workspace
              </Link>
              <Link
                href="/legal/billing"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "w-full",
                })}
              >
                See billing terms
              </Link>
            </CardContent>
            <CardFooter className="items-start border-t border-border/70 bg-transparent">
              <p className="text-sm leading-relaxed text-muted-foreground">
                After you sign in, purchases happen in Workspace settings →
                Billing for that workspace. Free Workspace limits, renewals, and
                soft-lock rules are documented in Billing terms.
              </p>
            </CardFooter>
          </Card>
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
