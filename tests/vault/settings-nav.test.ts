import { describe, expect, it } from "vitest";

import { workspaceSettingsNavItems } from "../../apps/web/components/app/settings-shell";
import {
  parentHrefFor,
  parseAppNavPath,
} from "../../apps/web/components/app/workspace-nav";

describe("settings nav items", () => {
  it("hides workspace danger for non-owners", () => {
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
