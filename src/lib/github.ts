import { parseReleaseBody } from "./parser";
import type { Release } from "./types";

const API_URL = "https://api.github.com/repos/anthropics/claude-code/releases?per_page=100";

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  prerelease: boolean;
  body: string;
}

export async function fetchReleases(): Promise<Release[]> {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data: GitHubRelease[] = await response.json();

  const releases: Release[] = data.map((r) => ({
    version: r.tag_name,
    name: r.name,
    date: r.published_at,
    prerelease: r.prerelease,
    items: parseReleaseBody(r.body),
  }));

  releases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return releases;
}
