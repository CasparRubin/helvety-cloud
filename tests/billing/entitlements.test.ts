/**
 * P12 entitlements: Free/Pro catalog, effective limits + addons.
 */
import { describe, expect, it } from "vitest";

import {
  ADDON_PACKS,
  CAPACITY_PACK,
  DISPLAY_PRICES,
  ENTITLED_STATUSES,
  PLAN_LIMITS,
  effectiveLimits,
  freeOverflowLockMessage,
  isUnlimited,
  limitMessage,
  limitToApi,
  ownedWorkspacesLimitMessage,
  resolvePlan,
  memberLimitMessage,
  selectFreeOverflowLockedIds,
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
    const free = PLAN_LIMITS.free;
    const pro = PLAN_LIMITS.pro;
    expect(pro.ownedWorkspaces).toBeGreaterThan(free.ownedWorkspaces);
    expect(pro.projectsPerWorkspace).toBeGreaterThan(free.projectsPerWorkspace);
    expect(pro.membersPerWorkspace).toBeGreaterThan(free.membersPerWorkspace);
    expect(pro.tasksPerProject).toBeGreaterThan(free.tasksPerProject);
    expect(pro.notesPerWorkspace).toBeGreaterThan(free.notesPerWorkspace);
    expect(pro.contactsPerWorkspace).toBeGreaterThan(free.contactsPerWorkspace);
    expect(pro.commentsPerWorkspace).toBeGreaterThan(free.commentsPerWorkspace);
    expect(pro.boardsPerWorkspace).toBeGreaterThan(free.boardsPerWorkspace);
    expect(pro.nodesPerBoard).toBeGreaterThan(free.nodesPerBoard);
    expect(pro.databasesPerWorkspace).toBeGreaterThan(
      free.databasesPerWorkspace,
    );
    expect(pro.tablesPerDatabase).toBeGreaterThan(free.tablesPerDatabase);
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

  it("matches the configured free and pro catalog", () => {
    expect(PLAN_LIMITS.free.ownedWorkspaces).toBe(1);
    expect(PLAN_LIMITS.free.projectsPerWorkspace).toBe(2);
    expect(PLAN_LIMITS.free.membersPerWorkspace).toBe(3);
    expect(PLAN_LIMITS.free.tasksPerProject).toBe(50);
    expect(PLAN_LIMITS.free.notesPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.free.contactsPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.free.commentsPerWorkspace).toBe(50);
    expect(PLAN_LIMITS.free.boardsPerWorkspace).toBe(1);
    expect(PLAN_LIMITS.free.nodesPerBoard).toBe(20);
    expect(PLAN_LIMITS.free.databasesPerWorkspace).toBe(1);
    expect(PLAN_LIMITS.free.tablesPerDatabase).toBe(10);

    expect(PLAN_LIMITS.pro.projectsPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.pro.membersPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.pro.tasksPerProject).toBe(1000);
    expect(PLAN_LIMITS.pro.notesPerWorkspace).toBe(500);
    expect(PLAN_LIMITS.pro.contactsPerWorkspace).toBe(500);
    expect(PLAN_LIMITS.pro.commentsPerWorkspace).toBe(1000);
    expect(PLAN_LIMITS.pro.boardsPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.pro.nodesPerBoard).toBe(400);
    expect(PLAN_LIMITS.pro.databasesPerWorkspace).toBe(25);
    expect(PLAN_LIMITS.pro.tablesPerDatabase).toBe(50);
    expect(PLAN_LIMITS.pro.filesPerTask).toBe(5);
    expect(PLAN_LIMITS.pro.storageBytesPerWorkspace).toBe(
      5 * 1024 * 1024 * 1024,
    );
    expect(PLAN_LIMITS.pro.maxUploadBytes).toBe(25 * 1024 * 1024);
  });

  it("keeps marketing display prices aligned with live Stripe yearly amounts", () => {
    expect(DISPLAY_PRICES.currency).toBe("CHF");
    expect(DISPLAY_PRICES.proWorkspaceYearly).toBe("250");
    expect(DISPLAY_PRICES.capacityIncreaseYearly).toBe("99");
  });

  it("maps every workspace meter to its plan cap", () => {
    const meters: WorkspaceMeter[] = [
      "projects",
      "tasks",
      "notes",
      "contacts",
      "comments",
      "boards",
      "databases",
      "tables",
    ];
    for (const meter of meters) {
      expect(workspaceMeterLimit(null, meter)).toBeGreaterThan(0);
      expect(
        workspaceMeterLimit({ plan: "pro", status: "active" }, meter),
      ).toBeGreaterThan(workspaceMeterLimit(null, meter));
    }
  });
});

describe("effective limits + addons", () => {
  it("defines the configured capacity increase bundle", () => {
    expect(CAPACITY_PACK.deltas.projects).toBe(10);
    expect(CAPACITY_PACK.deltas.tasksPerProject).toBe(500);
    expect(CAPACITY_PACK.deltas.notes).toBe(250);
    expect(CAPACITY_PACK.deltas.contacts).toBe(250);
    expect(CAPACITY_PACK.deltas.comments).toBe(500);
    expect(CAPACITY_PACK.deltas.boards).toBe(10);
    expect(CAPACITY_PACK.deltas.nodesPerBoard).toBe(200);
    expect(CAPACITY_PACK.deltas.databases).toBe(10);
    expect(CAPACITY_PACK.deltas.tablesPerDatabase).toBe(25);
    expect(CAPACITY_PACK.deltas.members).toBe(10);
    expect(CAPACITY_PACK.deltas.storageBytes).toBe(2.5 * 1024 * 1024 * 1024);
    expect(CAPACITY_PACK.deltas.filesPerTask).toBe(0);
  });

  it("adds capacity increase quantities onto every Pro meter", () => {
    expect(ADDON_PACKS).toHaveLength(1);
    const limits = effectiveLimits({
      plan: "pro",
      status: "active",
      addon_quantities: { capacity: 2 },
    });
    expect(limits.projectsPerWorkspace).toBe(
      PLAN_LIMITS.pro.projectsPerWorkspace + 2 * CAPACITY_PACK.deltas.projects,
    );
    expect(limits.tasksPerProject).toBe(
      PLAN_LIMITS.pro.tasksPerProject +
        2 * CAPACITY_PACK.deltas.tasksPerProject,
    );
    expect(limits.notesPerWorkspace).toBe(
      PLAN_LIMITS.pro.notesPerWorkspace + 2 * CAPACITY_PACK.deltas.notes,
    );
    expect(limits.contactsPerWorkspace).toBe(
      PLAN_LIMITS.pro.contactsPerWorkspace + 2 * CAPACITY_PACK.deltas.contacts,
    );
    expect(limits.commentsPerWorkspace).toBe(
      PLAN_LIMITS.pro.commentsPerWorkspace + 2 * CAPACITY_PACK.deltas.comments,
    );
    expect(limits.boardsPerWorkspace).toBe(
      PLAN_LIMITS.pro.boardsPerWorkspace + 2 * CAPACITY_PACK.deltas.boards,
    );
    expect(limits.nodesPerBoard).toBe(
      PLAN_LIMITS.pro.nodesPerBoard + 2 * CAPACITY_PACK.deltas.nodesPerBoard,
    );
    expect(limits.databasesPerWorkspace).toBe(
      PLAN_LIMITS.pro.databasesPerWorkspace +
        2 * CAPACITY_PACK.deltas.databases,
    );
    expect(limits.tablesPerDatabase).toBe(
      PLAN_LIMITS.pro.tablesPerDatabase +
        2 * CAPACITY_PACK.deltas.tablesPerDatabase,
    );
    expect(limits.membersPerWorkspace).toBe(
      PLAN_LIMITS.pro.membersPerWorkspace + 2 * CAPACITY_PACK.deltas.members,
    );
    expect(limits.filesPerTask).toBe(
      PLAN_LIMITS.pro.filesPerTask + 2 * CAPACITY_PACK.deltas.filesPerTask,
    );
    expect(limits.storageBytesPerWorkspace).toBe(
      PLAN_LIMITS.pro.storageBytesPerWorkspace +
        2 * CAPACITY_PACK.deltas.storageBytes,
    );
  });

  it("ignores addons on free", () => {
    const limits = effectiveLimits({
      plan: "free",
      status: "active",
      addon_quantities: { capacity: 99 },
    });
    expect(limits.projectsPerWorkspace).toBe(
      PLAN_LIMITS.free.projectsPerWorkspace,
    );
  });

  it("pro without addons matches catalog base", () => {
    const limits = effectiveLimits({
      plan: "pro",
      status: "active",
    });
    expect(limits.projectsPerWorkspace).toBe(
      PLAN_LIMITS.pro.projectsPerWorkspace,
    );
    expect(limitToApi(limits.projectsPerWorkspace)).toBe(
      PLAN_LIMITS.pro.projectsPerWorkspace,
    );
    expect(isUnlimited(limits.projectsPerWorkspace)).toBe(false);
  });
});

describe("limit copy", () => {
  it("states plan and cap, and only suggests upgrading from free", () => {
    const freeMsg = limitMessage("free", "projects", 2);
    expect(freeMsg).toContain("free plan");
    expect(freeMsg).toContain("2");
    expect(freeMsg).toContain("Upgrade");

    const proMsg = limitMessage("pro", "projects", 25);
    expect(proMsg).toContain("pro plan");
    expect(proMsg).not.toContain("Upgrade");
  });

  it("task copy is per project", () => {
    expect(limitMessage("pro", "tasks", 1000)).toContain("per project");
  });

  it("board copy is per workspace", () => {
    expect(limitMessage("free", "boards", 1)).toContain("per workspace");
    expect(limitMessage("free", "boards", 1)).toContain("Upgrade");
  });

  it("table copy is per database", () => {
    expect(limitMessage("pro", "tables", 50)).toContain("per database");
  });

  it("database copy is per workspace", () => {
    expect(limitMessage("free", "databases", 1)).toContain("per workspace");
  });

  it("member copy counts pending invitations honestly", () => {
    const msg = memberLimitMessage("free", 3);
    expect(msg).toContain("3 members");
    expect(msg).toContain("pending invitations");
  });

  it("owned workspace copy never promises recovery or data access", () => {
    const msg = ownedWorkspacesLimitMessage("free", 1);
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
  });

  it("storage copy blocks free uploads without recovery claims", () => {
    const msg = storageLimitMessage("free", 0);
    expect(msg.toLowerCase()).toContain("pro");
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
  });

  it("overflow lock copy keeps existing content available and never claims recovery", () => {
    const msg = freeOverflowLockMessage(1);
    expect(msg).toContain("1 free workspace per account");
    expect(msg).toContain("Existing content stays available");
    expect(msg.toLowerCase()).not.toContain("recover");
    expect(msg.toLowerCase()).not.toContain("decrypt");
    expect(msg.toLowerCase()).not.toContain("suspend");
  });
});

describe("selectFreeOverflowLockedIds", () => {
  it("locks nothing at or under the free allowance", () => {
    expect(
      selectFreeOverflowLockedIds(
        [{ workspaceId: "a", freeOverflowedAt: "2026-07-01T00:00:00Z" }],
        1,
      ).size,
    ).toBe(0);
  });

  it("a partial owned set under-locks (API must load the full creator-owned set)", () => {
    // Membership-scoped JWT reads can see only one overflow workspace; the
    // soft-lock helper would then think the account is within free allowance.
    expect(
      selectFreeOverflowLockedIds(
        [
          {
            workspaceId: "overflow-visible-only",
            freeOverflowedAt: "2026-07-01T00:00:00Z",
          },
        ],
        1,
      ).size,
    ).toBe(0);

    expect(
      selectFreeOverflowLockedIds(
        [
          {
            workspaceId: "personal-free",
            freeOverflowedAt: null,
          },
          {
            workspaceId: "overflow-visible-only",
            freeOverflowedAt: "2026-07-01T00:00:00Z",
          },
        ],
        1,
      ),
    ).toEqual(new Set(["overflow-visible-only"]));
  });

  it("locks newest tags first, untagged last", () => {
    expect(
      selectFreeOverflowLockedIds(
        [
          { workspaceId: "old", freeOverflowedAt: "2026-01-01T00:00:00Z" },
          { workspaceId: "new", freeOverflowedAt: "2026-07-01T00:00:00Z" },
          { workspaceId: "untagged", freeOverflowedAt: null },
        ],
        1,
      ),
    ).toEqual(new Set(["new", "old"]));

    expect(
      selectFreeOverflowLockedIds(
        [
          { workspaceId: "a", freeOverflowedAt: "2026-01-01T00:00:00Z" },
          { workspaceId: "b", freeOverflowedAt: "2026-03-01T00:00:00Z" },
          { workspaceId: "c", freeOverflowedAt: "2026-05-01T00:00:00Z" },
          { workspaceId: "d", freeOverflowedAt: "2026-07-01T00:00:00Z" },
        ],
        1,
      ),
    ).toEqual(new Set(["d", "c", "b"]));
  });

  it("when tags tie, prefers locking non-personal so Personal stays free", () => {
    expect(
      selectFreeOverflowLockedIds(
        [
          {
            workspaceId: "personal",
            freeOverflowedAt: null,
            kind: "personal",
          },
          {
            workspaceId: "abandoned-pro",
            freeOverflowedAt: null,
            kind: "standard",
          },
        ],
        1,
      ),
    ).toEqual(new Set(["abandoned-pro"]));
  });
});
