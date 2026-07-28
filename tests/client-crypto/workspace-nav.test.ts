import { describe, expect, it } from "vitest";

import { workspaceSettingsNavItems } from "../../apps/web/components/app/settings-shell";
import {
  isInAppWorkspacePath,
  parentHrefFor,
  parseAppNavPath,
  resolveNavBackMode,
} from "../../apps/web/components/app/workspace-nav";

describe("settings nav items", () => {
  it("can omit workspace danger nav", () => {
    const withDanger = workspaceSettingsNavItems("ws1");
    const withoutDanger = workspaceSettingsNavItems("ws1", {
      showDanger: false,
    });
    expect(withDanger.some((i) => i.href.endsWith("/danger"))).toBe(true);
    expect(withoutDanger.some((i) => i.href.endsWith("/danger"))).toBe(false);
  });
});

describe("parseAppNavPath settings", () => {
  it("classifies nested workspace settings as settings", () => {
    const loc = parseAppNavPath("/app/w/ws1/settings/billing");
    expect(loc?.section).toBe("settings");
    expect(parentHrefFor(loc!)).toBe("/app/w/ws1");
  });

  it("treats project settings as project entity and backs to the project", () => {
    const loc = parseAppNavPath("/app/w/ws1/p/p1/settings/stages");
    expect(loc?.section).toBe("projects");
    expect(loc?.entity).toEqual({ kind: "project", id: "p1" });
    expect(loc?.projectSettings).toBe(true);
    expect(parentHrefFor(loc!)).toBe("/app/w/ws1/p/p1");
  });
});

describe("resolveNavBackMode", () => {
  it("prefers in-app history over logical parent", () => {
    expect(
      resolveNavBackMode({
        hasInAppPredecessor: true,
        parentHref: "/app/w/ws1/p/p1",
      }),
    ).toBe("history");
  });

  it("falls back to logical parent when there is no in-app predecessor", () => {
    expect(
      resolveNavBackMode({
        hasInAppPredecessor: false,
        parentHref: "/app/w/ws1/notes",
      }),
    ).toBe("parent");
  });

  it("disables when neither history nor parent is available", () => {
    expect(
      resolveNavBackMode({
        hasInAppPredecessor: false,
        parentHref: null,
      }),
    ).toBe("none");
  });
});

describe("isInAppWorkspacePath", () => {
  it("accepts workspace routes and rejects bare /app", () => {
    expect(isInAppWorkspacePath("/app/w/ws1/notes/n1")).toBe(true);
    expect(isInAppWorkspacePath("/app")).toBe(false);
    expect(isInAppWorkspacePath("/login")).toBe(false);
  });
});
