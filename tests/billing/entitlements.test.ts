/**
 * P12 entitlements: Free/Pro catalog, effective limits + addons, unmetered comps.
 */
import { describe, expect, it } from "vitest";

import {
  ADDON_PACKS,
  ENTITLED_STATUSES,
  PLAN_LIMITS,
  effectiveLimits,
  isUnmetered,
  isUnlimited,
  limitMessage,
  limitToApi,
  limitsForPlan,
  ownedWorkspacesLimitMessage,
  resolvePlan,
  seatLimitMessage,
  storageLimitMessage,
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
    expect(pro.tasksPerProject).toBeGreaterThan(free.tasksPerProject);
    expect(pro.notesPerWorkspace).toBeGreaterThan(free.notesPerWorkspace);
    expect(pro.contactsPerWorkspace).toBeGreaterThan(free.contactsPerWorkspace);
    expect(pro.filesPerTask).toBeGreaterThan(free.filesPerTask);
    expect(pro.storageBytesPerWorkspace).toBeGreaterThan(
      free.storageBytesPerWorkspace,
    );
    expect(pro.maxUploadBytes).toBeGreaterThan(free.maxUploadBytes);
  });

  it("free plan blocks all file uploads (zero storage)", () => {
    expect(PLAN_LIMITS.free.storageBytesPerWorkspace).toBe(0);
    expect(PLAN_LIMITS.free.maxUploadBytes).toBe(0);
    expect(PLAN_LIMITS.free.filesPerTask).toBe(0);
    expect(PLAN_LIMITS.pro.storageBytesPerWorkspace).toBeGreaterThan(0);
    expect(PLAN_LIMITS.pro.maxUploadBytes).toBeGreaterThan(0);
  });

  it("free plan keeps at least the Personal workspace plus one", () => {
    expect(PLAN_LIMITS.free.ownedWorkspaces).toBeGreaterThanOrEqual(2);
    expect(PLAN_LIMITS.free.membersPerWorkspace).toBeGreaterThanOrEqual(1);
    expect(PLAN_LIMITS.free.projectsPerWorkspace).toBe(1);
  });

  it("maps every workspace meter to its plan cap", () => {
    const meters: WorkspaceMeter[] = ["projects", "tasks", "notes", "contacts"];
    for (const meter of meters) {
      expect(workspaceMeterLimit(null, meter)).toBeGreaterThan(0);
      expect(
        workspaceMeterLimit({ plan: "pro", status: "active" }, meter),
      ).toBeGreaterThan(workspaceMeterLimit(null, meter));
    }
  });
});

describe("effective limits + addons", () => {
  it("adds pack quantities onto Pro base", () => {
    const projectsPack = ADDON_PACKS.find((p) => p.meter === "projects");
    expect(projectsPack).toBeTruthy();
    const limits = effectiveLimits({
      plan: "pro",
      status: "active",
      addon_quantities: { projects: 2 },
    });
    expect(limits.projectsPerWorkspace).toBe(
      PLAN_LIMITS.pro.projectsPerWorkspace + 2 * (projectsPack?.packSize ?? 0),
    );
  });

  it("ignores addons on free", () => {
    const limits = effectiveLimits({
      plan: "free",
      status: "active",
      addon_quantities: { projects: 99 },
    });
    expect(limits.projectsPerWorkspace).toBe(
      PLAN_LIMITS.free.projectsPerWorkspace,
    );
  });

  it("unmetered comps unlock countable meters", () => {
    const sub = {
      plan: "pro" as const,
      status: "active",
      billing_source: "comp",
      unmetered: true,
    };
    expect(isUnmetered(sub)).toBe(true);
    const limits = effectiveLimits(sub);
    expect(isUnlimited(limits.projectsPerWorkspace)).toBe(true);
    expect(limitToApi(limits.projectsPerWorkspace)).toBeNull();
    expect(limits.maxUploadBytes).toBe(PLAN_LIMITS.pro.maxUploadBytes);
  });
});

describe("limit copy", () => {
  it("states plan and cap, and only suggests upgrading from free", () => {
    const freeMsg = limitMessage("free", "projects", 1);
    expect(freeMsg).toContain("free plan");
    expect(freeMsg).toContain("1");
    expect(freeMsg).toContain("Upgrade");

    const proMsg = limitMessage("pro", "projects", 25);
    expect(proMsg).toContain("pro plan");
    expect(proMsg).not.toContain("Upgrade");
  });

  it("task copy is per project", () => {
    expect(limitMessage("pro", "tasks", 500)).toContain("per project");
  });

  it("seat copy counts pending invitations honestly", () => {
    const msg = seatLimitMessage("free", 4);
    expect(msg).toContain("4 seats");
    expect(msg).toContain("pending invitations");
  });

  it("owned workspace copy never promises recovery or data access", () => {
    const msg = ownedWorkspacesLimitMessage("free", 2);
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
  });

  it("storage copy blocks free uploads without recovery claims", () => {
    const msg = storageLimitMessage("free", 0);
    expect(msg.toLowerCase()).toContain("pro");
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
  });
});
