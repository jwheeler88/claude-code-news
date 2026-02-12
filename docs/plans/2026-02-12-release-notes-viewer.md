# Claude Code Release Notes Viewer - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static single-page application for browsing Claude Code release notes, powered by Astro and deployed on Vercel.

**Architecture:** Astro fetches all releases from GitHub API at build time, parses markdown bodies into categorized bullet items, and outputs fully static HTML. Client-side vanilla JS handles filtering, search, pagination, and URL state. A `version.json` file enables a polling-based "new updates" toast.

**Tech Stack:** Astro 5, TypeScript, Vitest (testing), Scoped CSS, Google Fonts (Space Grotesk + Inter), Material Symbols Sharp, Vercel

---

### Task 1: Scaffold Astro Project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/pages/index.astro` (placeholder)

**Step 1: Initialize package.json**

```json
{
  "name": "claude-code-news",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^5.3.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create astro.config.mjs**

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
});
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

**Step 4: Create placeholder index page**

Create `src/pages/index.astro`:

```astro
---
// placeholder - will be replaced in Task 6
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Claude Code Release Notes</title>
  </head>
  <body>
    <h1>Claude Code Release Notes</h1>
    <p>Coming soon.</p>
  </body>
</html>
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated

**Step 6: Verify dev server starts**

Run: `npm run dev`
Expected: Astro dev server starts on `localhost:4321`

**Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/pages/index.astro
git commit -m "chore: scaffold Astro project with dev tooling"
```

---

### Task 2: Release Body Parser (TDD)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/parser.ts`
- Create: `tests/lib/parser.test.ts`

**Step 1: Create types**

Create `src/lib/types.ts`:

```ts
export type Category = "feature" | "bug-fix" | "performance" | "security" | "improvement";

export interface ChangeItem {
  text: string;
  category: Category;
}

export interface Release {
  version: string;
  name: string;
  date: string;
  prerelease: boolean;
  items: ChangeItem[];
}
```

**Step 2: Write failing tests for parser**

Create `tests/lib/parser.test.ts`:

```ts
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
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/parser.test.ts`
Expected: FAIL - module `../../src/lib/parser` not found

**Step 4: Implement parser**

Create `src/lib/parser.ts`:

```ts
import { categorize } from "./categorizer";
import type { ChangeItem } from "./types";

export function parseReleaseBody(body: string): ChangeItem[] {
  if (!body) return [];

  const lines = body.split("\n");
  const items: ChangeItem[] = [];

  for (const line of lines) {
    const match = line.match(/^-\s+(.+)/);
    if (!match) continue;
    const text = match[1].trim();
    if (!text) continue;
    items.push({ text, category: categorize(text) });
  }

  return items;
}
```

Note: This depends on `categorize` from Task 3. For now, create a stub:

Create temporary stub in `src/lib/categorizer.ts`:

```ts
import type { Category } from "./types";

export function categorize(_text: string): Category {
  return "improvement";
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/parser.test.ts`
Expected: All 6 tests PASS

**Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/parser.ts src/lib/categorizer.ts tests/lib/parser.test.ts
git commit -m "feat: add release body parser with tests"
```

---

### Task 3: Category Heuristic (TDD)

**Files:**
- Modify: `src/lib/categorizer.ts` (replace stub)
- Create: `tests/lib/categorizer.test.ts`

**Step 1: Write failing tests for categorizer**

Create `tests/lib/categorizer.test.ts`:

```ts
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

  it("defaults to improvement", () => {
    expect(categorize("Updated documentation links")).toBe("improvement");
  });

  it("is case-insensitive for keywords", () => {
    expect(categorize("FIXED a bug")).toBe("bug-fix");
  });

  it("prioritizes bug-fix over performance (Fixed performance issue)", () => {
    expect(categorize("Fixed performance regression")).toBe("bug-fix");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/categorizer.test.ts`
Expected: FAIL - stub returns "improvement" for everything

**Step 3: Implement categorizer**

Replace `src/lib/categorizer.ts`:

```ts
import type { Category } from "./types";

export function categorize(text: string): Category {
  const lower = text.toLowerCase();

  if (/^fix(ed)?\b/.test(lower)) return "bug-fix";
  if (/^(added|new)\b/.test(lower) || lower.includes("is now available")) return "feature";
  if (/performance|faster|rendering/.test(lower)) return "performance";
  if (/security|blocked|prevent/.test(lower)) return "security";

  return "improvement";
}
```

**Step 4: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests pass (parser + categorizer)

**Step 5: Commit**

```bash
git add src/lib/categorizer.ts tests/lib/categorizer.test.ts
git commit -m "feat: add keyword-based category heuristic with tests"
```

---

### Task 4: GitHub API Data Fetcher

**Files:**
- Create: `src/lib/github.ts`
- Create: `tests/lib/github.test.ts`

**Step 1: Write failing tests for fetcher**

Create `tests/lib/github.test.ts`:

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/github.test.ts`
Expected: FAIL - module not found

**Step 3: Implement fetcher**

Create `src/lib/github.ts`:

```ts
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
```

**Step 4: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/lib/github.ts tests/lib/github.test.ts
git commit -m "feat: add GitHub releases API fetcher with tests"
```

---

### Task 5: Base Layout Component

**Files:**
- Create: `src/layouts/Layout.astro`

**Step 1: Create the base layout**

Create `src/layouts/Layout.astro`:

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Browse Claude Code release notes by category" />
    <title>{title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,400,0,0"
      rel="stylesheet"
    />
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --color-bg: #0a0a0a;
    --color-surface: #141414;
    --color-surface-hover: #1a1a1a;
    --color-border: #2a2a2a;
    --color-text: #e5e5e5;
    --color-text-muted: #888;
    --color-accent: #e42313;
    --color-accent-dim: rgba(228, 35, 19, 0.15);
    --font-heading: "Space Grotesk", sans-serif;
    --font-body: "Inter", sans-serif;
    --sidebar-width: 280px;
  }

  html {
    font-family: var(--font-body);
    background: var(--color-bg);
    color: var(--color-text);
  }

  body {
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  ul {
    list-style: none;
  }
</style>
```

**Step 2: Verify build works**

Run: `npm run build`
Expected: Build succeeds (even though index.astro doesn't use Layout yet)

**Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add base Layout with dark theme, fonts, and CSS reset"
```

---

### Task 6: Sidebar Component

**Files:**
- Create: `src/components/Sidebar.astro`

**Step 1: Create the sidebar component**

Create `src/components/Sidebar.astro`:

```astro
---
import type { Category } from "../lib/types";

interface CategoryNav {
  label: string;
  value: string;
  count: number;
}

interface Props {
  categories: CategoryNav[];
  totalReleases: number;
  latestVersion: string;
}

const { categories, totalReleases, latestVersion } = Astro.props;
---
<aside class="sidebar">
  <div class="logo">
    <span class="material-symbols-sharp logo-icon">terminal</span>
    <span class="logo-text">Claude Code</span>
  </div>
  <span class="sidebar-label">Release Notes</span>

  <nav class="category-nav">
    <ul>
      <li>
        <button class="nav-item active" data-category="all">
          <span class="nav-label">All Releases</span>
          <span class="nav-count">{totalReleases}</span>
        </button>
      </li>
      {categories.map((cat) => (
        <li>
          <button class="nav-item" data-category={cat.value}>
            <span class="nav-label">{cat.label}</span>
            <span class="nav-count">{cat.count}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>

  <div class="stats-box">
    <div class="stat">
      <span class="stat-value">{totalReleases}</span>
      <span class="stat-label">Total Releases</span>
    </div>
    <div class="stat">
      <span class="stat-value">{latestVersion}</span>
      <span class="stat-label">Latest Version</span>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .logo-icon {
    font-size: 28px;
    color: var(--color-accent);
  }

  .logo-text {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 700;
  }

  .sidebar-label {
    font-size: 13px;
    color: var(--color-text-muted);
    margin-bottom: 24px;
  }

  .category-nav {
    flex: 1;
  }

  .category-nav ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-muted);
    font-family: var(--font-body);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .nav-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .nav-item.active {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .nav-count {
    font-size: 12px;
    font-weight: 600;
    min-width: 24px;
    text-align: center;
  }

  .stats-box {
    margin-top: 24px;
    padding: 16px;
    background: var(--color-bg);
    border-radius: 10px;
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value {
    font-family: var(--font-heading);
    font-size: 18px;
    font-weight: 600;
  }

  .stat-label {
    font-size: 12px;
    color: var(--color-text-muted);
  }
</style>
```

**Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Sidebar.astro
git commit -m "feat: add Sidebar component with category nav and stats"
```

---

### Task 7: Release Card Component

**Files:**
- Create: `src/components/ReleaseCard.astro`

**Step 1: Create the release card component**

Create `src/components/ReleaseCard.astro`:

```astro
---
import type { Release } from "../lib/types";

interface Props {
  release: Release;
}

const { release } = Astro.props;

const categoryLabels: Record<string, string> = {
  feature: "Feature",
  "bug-fix": "Bug Fix",
  performance: "Performance",
  security: "Security",
  improvement: "Improvement",
};

const uniqueCategories = [...new Set(release.items.map((item) => item.category))];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
---
<article class="release-card" data-version={release.version} data-categories={JSON.stringify(uniqueCategories)}>
  <header class="card-header">
    <div class="card-title-row">
      <h2 class="version">{release.version}</h2>
      <time class="date" datetime={release.date}>{formatDate(release.date)}</time>
    </div>
    <div class="tags">
      {uniqueCategories.map((cat) => (
        <span class={`tag tag-${cat}`}>{categoryLabels[cat]}</span>
      ))}
    </div>
  </header>
  <ul class="changes">
    {release.items.map((item) => (
      <li class="change-item" data-category={item.category}>
        <span class="item-text">{item.text}</span>
        <button class="copy-btn" data-copy={item.text} aria-label="Copy to clipboard">
          <span class="material-symbols-sharp">content_copy</span>
        </button>
      </li>
    ))}
  </ul>
</article>

<style>
  .release-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 24px;
  }

  .card-header {
    margin-bottom: 16px;
  }

  .card-title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }

  .version {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 600;
  }

  .date {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tag-feature {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .tag-bug-fix {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .tag-performance {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .tag-security {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .tag-improvement {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .changes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .change-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }

  .change-item:hover {
    background: var(--color-surface-hover);
    border-left-color: var(--color-accent);
  }

  .item-text {
    font-size: 14px;
    line-height: 1.5;
  }

  .copy-btn {
    opacity: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
    transition: opacity 0.15s, color 0.15s;
  }

  .change-item:hover .copy-btn {
    opacity: 1;
  }

  .copy-btn:hover {
    color: var(--color-accent);
  }
</style>
```

**Step 2: Verify build works**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ReleaseCard.astro
git commit -m "feat: add ReleaseCard component with category tags and copy button"
```

---

### Task 8: Assemble Main Page

**Files:**
- Modify: `src/pages/index.astro` (replace placeholder)

**Step 1: Build the main page**

Replace `src/pages/index.astro`:

```astro
---
import Layout from "../layouts/Layout.astro";
import Sidebar from "../components/Sidebar.astro";
import ReleaseCard from "../components/ReleaseCard.astro";
import { fetchReleases } from "../lib/github";
import type { Category } from "../lib/types";

const releases = await fetchReleases();

const categoryMeta: { label: string; value: Category }[] = [
  { label: "Features", value: "feature" },
  { label: "Bug Fixes", value: "bug-fix" },
  { label: "Performance", value: "performance" },
  { label: "Security", value: "security" },
  { label: "Improvements", value: "improvement" },
];

const categoryCounts = categoryMeta.map((cat) => ({
  ...cat,
  count: releases.filter((r) => r.items.some((item) => item.category === cat.value)).length,
}));

const latestVersion = releases.length > 0 ? releases[0].version : "N/A";
const buildTimestamp = Date.now();
---
<Layout title="Claude Code Release Notes">
  <Sidebar
    categories={categoryCounts}
    totalReleases={releases.length}
    latestVersion={latestVersion}
  />

  <main class="content">
    <header class="content-header">
      <div class="header-text">
        <h1 class="page-title">Release Notes</h1>
        <p class="page-subtitle">Stay up to date with the latest changes to Claude Code</p>
      </div>
      <div class="search-wrapper">
        <span class="material-symbols-sharp search-icon">search</span>
        <input
          type="text"
          id="search-input"
          class="search-input"
          placeholder="Search releases..."
          autocomplete="off"
        />
      </div>
    </header>

    <div id="release-list" class="release-list">
      {releases.map((release, i) => (
        <div class="release-wrapper" data-index={i}>
          <ReleaseCard release={release} />
        </div>
      ))}
    </div>

    <div id="load-more-container" class="load-more-container">
      <button id="load-more-btn" class="load-more-btn">Load more</button>
    </div>
  </main>

  <div id="toast" class="toast" hidden>
    <span>New releases available</span>
    <a href="/" class="toast-refresh">Refresh</a>
    <button id="toast-dismiss" class="toast-dismiss" aria-label="Dismiss">
      <span class="material-symbols-sharp">close</span>
    </button>
  </div>
</Layout>

<script is:inline define:vars={{ buildTimestamp }}>
  window.__BUILD_TIMESTAMP__ = buildTimestamp;
</script>

<style>
  .content {
    margin-left: var(--sidebar-width);
    padding: 32px 40px;
    max-width: 960px;
  }

  .content-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;
  }

  .page-title {
    font-family: var(--font-heading);
    font-size: 28px;
    font-weight: 700;
  }

  .page-subtitle {
    font-size: 14px;
    color: var(--color-text-muted);
    margin-top: 4px;
  }

  .search-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
    color: var(--color-text-muted);
  }

  .search-input {
    padding: 10px 16px 10px 40px;
    width: 260px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-input:focus {
    border-color: var(--color-accent);
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .release-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .load-more-container {
    margin-top: 24px;
    text-align: center;
  }

  .load-more-btn {
    padding: 12px 32px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .load-more-btn:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-text-muted);
  }

  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .toast[hidden] {
    display: none;
  }

  .toast-refresh {
    color: var(--color-accent);
    font-weight: 600;
  }

  .toast-dismiss {
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0;
    display: flex;
  }
</style>
```

**Step 2: Write version.json generation**

Create `src/lib/build-version.ts` — an Astro integration hook that writes `version.json` to `public/`:

Actually, the simplest approach is to generate it during the Astro build via an integration. But even simpler: use `define:vars` to embed the timestamp and write a static `public/version.json` at build time via a small script.

Create a simpler approach — add a `postbuild` npm script. Update `package.json` scripts:

Add to `package.json` scripts:
```json
"postbuild": "node -e \"require('fs').writeFileSync('dist/version.json', JSON.stringify({buildTimestamp: Date.now()}))\""
```

**Step 3: Verify the site builds and renders**

Run: `npm run build`
Expected: Build succeeds, produces `dist/` with `index.html` and `version.json`

**Step 4: Preview the built site**

Run: `npm run preview`
Expected: Site loads at localhost, shows two-column layout with real release data

**Step 5: Commit**

```bash
git add src/pages/index.astro package.json
git commit -m "feat: assemble main page with releases, search, and load-more structure"
```

---

### Task 9: Client-Side Interactivity — Filtering, Search, Pagination

**Files:**
- Create: `src/scripts/app.ts`
- Modify: `src/pages/index.astro` (add script import)

**Step 1: Write the client-side script**

Create `src/scripts/app.ts`:

```ts
const BATCH_SIZE = 10;

let activeCategory = "all";
let searchQuery = "";
let visibleCount = BATCH_SIZE;

const searchInput = document.getElementById("search-input") as HTMLInputElement;
const releaseList = document.getElementById("release-list")!;
const loadMoreBtn = document.getElementById("load-more-btn")!;
const loadMoreContainer = document.getElementById("load-more-container")!;
const navItems = document.querySelectorAll<HTMLButtonElement>(".nav-item");
const releaseWrappers = Array.from(releaseList.querySelectorAll<HTMLElement>(".release-wrapper"));

function getMatchingWrappers(): HTMLElement[] {
  return releaseWrappers.filter((wrapper) => {
    const card = wrapper.querySelector(".release-card") as HTMLElement;
    if (!card) return false;

    // Category filter
    if (activeCategory !== "all") {
      const cats: string[] = JSON.parse(card.dataset.categories || "[]");
      if (!cats.includes(activeCategory)) return false;
    }

    // Search filter
    if (searchQuery) {
      const version = card.dataset.version?.toLowerCase() || "";
      const text = card.textContent?.toLowerCase() || "";
      if (!version.includes(searchQuery) && !text.includes(searchQuery)) return false;
    }

    return true;
  });
}

function filterItems(wrapper: HTMLElement): void {
  if (activeCategory === "all") {
    wrapper.querySelectorAll<HTMLElement>(".change-item").forEach((item) => {
      item.style.display = "";
    });
  } else {
    wrapper.querySelectorAll<HTMLElement>(".change-item").forEach((item) => {
      item.style.display = item.dataset.category === activeCategory ? "" : "none";
    });
  }
}

function render(): void {
  const matching = getMatchingWrappers();

  // Hide all, then show matching up to visibleCount
  releaseWrappers.forEach((w) => (w.style.display = "none"));
  matching.forEach((w, i) => {
    if (i < visibleCount) {
      w.style.display = "";
      filterItems(w);
    }
  });

  // Load more button
  loadMoreContainer.style.display = matching.length > visibleCount ? "" : "none";

  // Update URL
  const params = new URLSearchParams();
  if (activeCategory !== "all") params.set("category", activeCategory);
  if (searchQuery) params.set("q", searchQuery);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, "", url);
}

// Category navigation
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category || "all";
    visibleCount = BATCH_SIZE;
    render();
  });
});

// Search
let debounceTimer: ReturnType<typeof setTimeout>;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    visibleCount = BATCH_SIZE;
    render();
  }, 200);
});

// Load more
loadMoreBtn.addEventListener("click", () => {
  visibleCount += BATCH_SIZE;
  render();
});

// Copy to clipboard
releaseList.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement;
  if (!btn) return;

  const text = btn.dataset.copy || "";
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector(".material-symbols-sharp");
    if (icon) {
      icon.textContent = "check";
      setTimeout(() => (icon.textContent = "content_copy"), 1500);
    }
  });
});

// Init from URL params
function initFromURL(): void {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("category");
  const q = params.get("q");

  if (cat) {
    activeCategory = cat;
    navItems.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === cat);
    });
  }

  if (q) {
    searchQuery = q.toLowerCase();
    searchInput.value = q;
  }

  render();
}

initFromURL();
```

**Step 2: Import the script in index.astro**

Add to `src/pages/index.astro`, before the closing `</Layout>` tag but after the `</style>` block:

```astro
<script src="../scripts/app.ts"></script>
```

**Step 3: Verify filtering works**

Run: `npm run dev`
Expected:
- Clicking sidebar categories filters the release list
- Search input filters releases by text content
- Load More shows next batch
- URL updates with query params
- Copy button copies text and shows checkmark

**Step 4: Commit**

```bash
git add src/scripts/app.ts src/pages/index.astro
git commit -m "feat: add client-side filtering, search, pagination, and copy"
```

---

### Task 10: New Updates Toast

**Files:**
- Create: `src/scripts/toast.ts`
- Modify: `src/pages/index.astro` (add script import)

**Step 1: Write the toast polling script**

Create `src/scripts/toast.ts`:

```ts
const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

const toast = document.getElementById("toast")!;
const dismissBtn = document.getElementById("toast-dismiss")!;

const loadedTimestamp = (window as any).__BUILD_TIMESTAMP__ as number;

async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.buildTimestamp > loadedTimestamp) {
      toast.hidden = false;
    }
  } catch {
    // Silently ignore - not critical
  }
}

dismissBtn.addEventListener("click", () => {
  toast.hidden = true;
});

setInterval(checkForUpdates, POLL_INTERVAL);
```

**Step 2: Import in index.astro**

Add to `src/pages/index.astro`:

```astro
<script src="../scripts/toast.ts"></script>
```

**Step 3: Verify toast shows when version.json changes**

Run: `npm run dev`
Manually test: The toast won't show in dev since timestamps match. This is best verified in a full build + preview.

**Step 4: Commit**

```bash
git add src/scripts/toast.ts src/pages/index.astro
git commit -m "feat: add new updates toast with version.json polling"
```

---

### Task 11: Vercel Deployment Configuration

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel config**

Create `vercel.json`:

```json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Step 2: Verify build produces correct output**

Run: `npm run build && ls dist/`
Expected: `dist/` contains `index.html`, `version.json`, and asset files

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment configuration"
```

---

### Task 12: Final Polish and Validation

**Files:**
- Possibly modify: `src/layouts/Layout.astro` (add favicon, meta tags)
- Possibly modify: various style tweaks

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Build the site**

Run: `npm run build`
Expected: Clean build with no warnings

**Step 3: Preview and manually validate**

Run: `npm run preview`

Validate:
- [ ] Two-column layout renders correctly
- [ ] Sidebar shows correct category counts
- [ ] Category filtering works
- [ ] Search filters across version + body text
- [ ] Search + category filter work together
- [ ] Load More reveals next batch
- [ ] Copy button works on hover
- [ ] URL params update on filter/search
- [ ] Loading the URL with params restores state
- [ ] Dark theme looks correct
- [ ] Fonts load (Space Grotesk for headings, Inter for body)
- [ ] Material Symbols icons render

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish and validation"
```

**Step 5: Push branch**

```bash
git push -u origin feature/implementation
```
