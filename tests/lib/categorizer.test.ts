import { describe, it, expect } from "vitest";
import { categorize } from "../../src/lib/categorizer";

describe("categorize", () => {
  it('classifies "Fixed ..." as bug-fix', () => {
    expect(categorize("Fixed crash on startup")).toBe("bug-fix");
  });

  it('classifies "Fix ..." as bug-fix', () => {
    expect(categorize("Fix for terminal rendering issue")).toBe("bug-fix");
  });

  it('classifies "Added ..." as feature', () => {
    expect(categorize("Added dark mode support")).toBe("feature");
  });

  it('classifies "New ..." as feature', () => {
    expect(categorize("New command palette")).toBe("feature");
  });

  it('classifies "is now available" as feature', () => {
    expect(categorize("Claude Opus 4.6 is now available!")).toBe("feature");
  });

  it('classifies "performance" keyword as performance', () => {
    expect(categorize("Improved terminal rendering performance")).toBe("performance");
  });

  it('classifies "faster" keyword as performance', () => {
    expect(categorize("Made startup 2x faster")).toBe("performance");
  });

  it('classifies "rendering" keyword as performance', () => {
    expect(categorize("Improved rendering in large files")).toBe("performance");
  });

  it('classifies "security" keyword as security', () => {
    expect(categorize("Updated security dependencies")).toBe("security");
  });

  it('classifies "blocked" keyword as security', () => {
    expect(categorize("Blocked unauthorized API access")).toBe("security");
  });

  it('classifies "prevent" keyword as security', () => {
    expect(categorize("Prevent command injection attacks")).toBe("security");
  });

  it('classifies "Improved ..." as improvement', () => {
    expect(categorize("Improved error messages for failed commands")).toBe("improvement");
  });

  it('classifies "Improve ..." as improvement', () => {
    expect(categorize("Improve tab completion accuracy")).toBe("improvement");
  });

  it("defaults to misc", () => {
    expect(categorize("Updated documentation links")).toBe("misc");
  });

  it("is case-insensitive for keywords", () => {
    expect(categorize("FIXED a bug")).toBe("bug-fix");
  });

  it("prioritizes bug-fix over performance (Fixed performance issue)", () => {
    expect(categorize("Fixed performance regression")).toBe("bug-fix");
  });
});
