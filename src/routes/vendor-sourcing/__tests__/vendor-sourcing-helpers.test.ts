import { describe, expect, it } from "vitest";

import { KIND_META, STATUS_META, ago } from "../vendor-sourcing-list";

describe("sourcing queue metadata", () => {
  it("covers every ticket kind with a label and colour", () => {
    expect(KIND_META.contact_sourcing.label).toBe("Find contact");
    expect(KIND_META.vendor_sourcing.label).toBe("Find vendors");
  });

  it("covers every status the backend can return", () => {
    for (const s of ["pending", "in_progress", "complete", "cancelled"] as const) {
      expect(STATUS_META[s].label).toBeTruthy();
      expect(STATUS_META[s].color).toBeTruthy();
    }
  });
});

describe("ago", () => {
  it("renders hours for same-day tickets", () => {
    expect(ago(new Date(Date.now() - 2 * 3_600_000).toISOString())).toBe("2h ago");
    expect(ago(new Date().toISOString())).toBe("just now");
  });

  it("renders days up to a month, then a plain date", () => {
    expect(ago(new Date(Date.now() - 86_400_000).toISOString())).toBe("1 day ago");
    expect(ago(new Date(Date.now() - 5 * 86_400_000).toISOString())).toBe("5 days ago");
    const old = new Date(Date.now() - 90 * 86_400_000);
    expect(ago(old.toISOString())).toBe(old.toLocaleDateString());
  });
});
