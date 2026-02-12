import { describe, it, expect } from "vitest";
import { parseReleaseBody } from "../../src/lib/parser";

describe("parseReleaseBody", () => {
  it("extracts bullet items from a release body", () => {
    const body = `## What's changed\n\n- Added dark mode support\n- Fixed crash on startup\n- Improved rendering speed`;
    const items = parseReleaseBody(body);
    expect(items).toHaveLength(3);
    expect(items[0].text).toBe("Added dark mode support");
    expect(items[1].text).toBe("Fixed crash on startup");
    expect(items[2].text).toBe("Improved rendering speed");
  });

  it("returns empty array for empty body", () => {
    expect(parseReleaseBody("")).toEqual([]);
  });

  it("returns empty array for body with no bullets", () => {
    expect(parseReleaseBody("## What's changed\n\nNo changes.")).toEqual([]);
  });

  it("handles bullets with inline markdown", () => {
    const body = "## What's changed\n\n- Added `--verbose` flag for **detailed** output";
    const items = parseReleaseBody(body);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Added `--verbose` flag for **detailed** output");
  });

  it("trims whitespace from items", () => {
    const body = "## What's changed\n\n-   Extra spaces here   ";
    const items = parseReleaseBody(body);
    expect(items[0].text).toBe("Extra spaces here");
  });

  it("skips empty bullet lines", () => {
    const body = "## What's changed\n\n- First item\n- \n- Third item";
    const items = parseReleaseBody(body);
    expect(items).toHaveLength(2);
  });
});
