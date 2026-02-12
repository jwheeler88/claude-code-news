# Claude Code Release Notes Viewer - Design

## Overview

A static single-page application for browsing Claude Code release notes. Built with Astro, deployed on Vercel, sourced from the GitHub Releases API.

## Data Source

- **GitHub Releases API:** `GET /repos/anthropics/claude-code/releases`
- Fetched at **build time** - no client-side API calls for content
- Currently ~30 releases, expected to grow quickly
- Each release provides: `tag_name`, `name`, `published_at`, `body` (markdown), `prerelease`
- Body format is consistently `## What's changed` followed by a bulleted list

## Category Heuristic

Each bullet point is categorized at build time using keyword matching:

| Rule | Category |
|------|----------|
| Starts with "Fixed" / "Fix" | Bug Fix |
| Starts with "Added" / "New" / contains "is now available" | Feature |
| Contains "performance" / "faster" / "rendering" | Performance |
| Contains "security" / "blocked" / "prevent" | Security |
| Everything else | Improvement |

Categories are computed once during the Astro build. No runtime classification needed.

## Architecture

### Build Pipeline

1. Astro build triggers (on deploy)
2. Fetch all releases from GitHub API (paginated)
3. Parse each release body into individual bullet items
4. Run keyword categorizer on each item
5. Output static HTML with all release data embedded
6. Write `version.json` with build timestamp

### Deployment

- **Host:** Vercel
- **Rebuild trigger:** GitHub webhook on `release.published` event from `anthropics/claude-code`
- **Result:** Site redeploys within seconds of a new release being published

### New Updates Toast

- Client-side script polls `version.json` every ~2 minutes
- If build timestamp is newer than what the page loaded with, show a subtle toast: "New releases available" with a refresh link
- Dismissible

## Layout

### Two-Column Layout

**Left Sidebar (280px fixed):**
- Claude Code logo (Material Symbols Sharp terminal icon + "Claude Code" in Space Grotesk)
- "Release Notes" label
- Category navigation:
  - All Releases
  - Features
  - Bug Fixes
  - Performance
  - Security
  - Improvements
- Each nav item shows a count of matching releases
- Active category highlighted with red accent
- Statistics box at bottom (Total Releases count, latest version)

**Main Content Area (fluid width):**
- Header: "Release Notes" title + subtitle + search input (top right)
- Release cards in vertical list, sorted newest-first
- "Load more" button at bottom

No filter badges in the content area - sidebar owns all category filtering.

### Release Cards

- All cards are **expanded by default** (showing full change list)
- Header row: version number, date, category tag badge(s)
- Body: bulleted change items
- 10 releases shown initially, "Load more" reveals next 10 batch
- All data is in the DOM but hidden - no network calls on Load More

## Interactivity

### Category Filtering

- Clicking a sidebar category filters the release list
- "All Releases" shows everything
- Selecting e.g. "Bug Fixes" shows only releases containing at least one bug fix item, and within those releases only the bug fix items are shown
- Active category gets red accent highlight

### Search

- Real-time text filtering across version numbers and body text
- Works alongside active category filter (search within "Bug Fixes" for "terminal")
- Debounced ~200ms

### Copy on Hover

- Each change bullet has a copy icon that fades in on hover
- Highlighted background + red accent border on hover
- Click copies the item text
- Brief "Copied!" tooltip confirmation

### URL State

- Active category and search query reflected in URL query params
- Example: `?category=bug-fix&q=terminal`
- Filtered views are shareable and bookmarkable

## Styling

### Theme

- **Dark theme** throughout
- Dark background, subtle borders, white/light text
- Red accent: `#E42313` for active states, tags, brand elements

### Typography

- **Space Grotesk:** Logo, headings, version numbers (geometric, techy)
- **Inter:** Body text, labels, nav items

### Icons

- **Material Symbols Sharp** - angular icon style, used for logo and UI elements

## Tech Stack

- **Framework:** Astro (static site generation)
- **Styling:** Scoped CSS (Astro built-in)
- **Icons:** Material Symbols Sharp
- **Fonts:** Space Grotesk, Inter (Google Fonts)
- **Deploy:** Vercel
- **Data:** GitHub Releases API (build-time fetch)
