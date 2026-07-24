/**
 * P6f entitlements: plans/limits live in code; inactive Stripe statuses never
 * grant paid entitlements; limit copy is honest (no vault data involved).
 */
import { describe, expect, it } from "vitest";

import {
  ENTITLED_STATUSES,
  PLAN_LIMITS,
  limitMessage,
  limitsForPlan,
  ownedWorkspacesLimitMessage,
  resolvePlan,
  seatLimitMessage,
  workspaceMeterLimit,
  type WorkspaceMeter,
} from "../../apps/web/lib/billing/entitlements";

describe("resolvePlan", () => {
  it("treats a missing subscription row as free (no Stripe customer needed)", () => {
    expect(resolvePlan(null)).toBe("free");
  });

  it("grants pro only for entitled statuses", () => {
    for (const status of ENTITLED_STATUSES) {
      expect(resolvePlan({ plan: "pro", status })).toBe("pro");
    }
  });

  it("downgrades lapsed or broken subscriptions to free", () => {
    const lapsed = [
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ];
    for (const status of lapsed) {
      expect(resolvePlan({ plan: "pro", status })).toBe("free");
    }
  });

  it("never grants pro for unknown plan values", () => {
    expect(resolvePlan({ plan: "enterprise", status: "active" })).toBe("free");
    expect(resolvePlan({ plan: "free", status: "active" })).toBe("free");
  });
});

describe("plan limits", () => {
  it("pro raises every cap above free", () => {
    const free = limitsForPlan("free");
    const pro = limitsForPlan("pro");
    expect(pro.ownedWorkspaces).toBeGreaterThan(free.ownedWorkspaces);
    expect(pro.projectsPerWorkspace).toBeGreaterThan(free.projectsPerWorkspace);
    expect(pro.membersPerWorkspace).toBeGreaterThan(free.membersPerWorkspace);
    expect(pro.issuesPerWorkspace).toBeGreaterThan(free.issuesPerWorkspace);
    expect(pro.notesPerWorkspace).toBeGreaterThan(free.notesPerWorkspace);
    expect(pro.contactsPerWorkspace).toBeGreaterThan(free.contactsPerWorkspace);
  });

  it("free plan keeps at least the Personal workspace plus one", () => {
    expect(PLAN_LIMITS.free.ownedWorkspaces).toBeGreaterThanOrEqual(2);
    expect(PLAN_LIMITS.free.membersPerWorkspace).toBeGreaterThanOrEqual(1);
  });

  it("maps every workspace meter to its plan cap", () => {
    const meters: WorkspaceMeter[] = ["projects", "issues", "notes", "contacts"];
    for (const meter of meters) {
      expect(workspaceMeterLimit("free", meter)).toBeGreaterThan(0);
      expect(workspaceMeterLimit("pro", meter)).toBeGreaterThan(
        workspaceMeterLimit("free", meter),
      );
    }
  });
});

describe("limit copy", () => {
  it("states plan and cap, and only suggests upgrading from free", () => {
    const freeMsg = limitMessage("free", "projects", 5);
    expect(freeMsg).toContain("free plan");
    expect(freeMsg).toContain("5");
    expect(freeMsg).toContain("Upgrade");

    const proMsg = limitMessage("pro", "projects", 100);
    expect(proMsg).toContain("pro plan");
    expect(proMsg).not.toContain("Upgrade");
  });

  it("seat copy counts pending invitations honestly", () => {
    const msg = seatLimitMessage("free", 2);
    expect(msg).toContain("2 seats");
    expect(msg).toContain("pending invitations");
  });

  it("owned workspace copy never promises recovery or data access", () => {
    const msg = ownedWorkspacesLimitMessage("free", 2);
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
  });
});
