import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchReleases } from "../../src/lib/github";

const mockRelease = {
  tag_name: "v1.0.0",
  name: "v1.0.0",
  published_at: "2025-01-15T00:00:00Z",
  prerelease: false,
  body: "## What's changed\n\n- Added new feature\n- Fixed a bug",
};

describe("fetchReleases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and parses releases from GitHub API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockRelease]),
      })
    );

    const releases = await fetchReleases();
    expect(releases).toHaveLength(1);
    expect(releases[0].version).toBe("v1.0.0");
    expect(releases[0].date).toBe("2025-01-15T00:00:00Z");
    expect(releases[0].prerelease).toBe(false);
    expect(releases[0].items).toHaveLength(2);
    expect(releases[0].items[0].text).toBe("Added new feature");
    expect(releases[0].items[0].category).toBe("feature");
    expect(releases[0].items[1].category).toBe("bug-fix");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      })
    );

    await expect(fetchReleases()).rejects.toThrow("GitHub API error: 403 Forbidden");
  });

  it("sorts releases newest-first by date", async () => {
    const older = { ...mockRelease, tag_name: "v0.9.0", name: "v0.9.0", published_at: "2024-12-01T00:00:00Z" };
    const newer = { ...mockRelease, tag_name: "v1.1.0", name: "v1.1.0", published_at: "2025-02-01T00:00:00Z" };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([older, newer]),
      })
    );

    const releases = await fetchReleases();
    expect(releases[0].version).toBe("v1.1.0");
    expect(releases[1].version).toBe("v0.9.0");
  });
});
