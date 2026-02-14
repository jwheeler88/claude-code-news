# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static Astro site that displays Claude Code release notes fetched from GitHub. It features a filterable, searchable interface with category-based navigation and a HAL 9000-themed design.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build  # Runs Astro build + generates version.json from GitHub API

# Preview production build
npm run preview

# Run tests
npm test        # Run once
npm run test:watch  # Watch mode
```

## Architecture

### Build-Time Data Flow

1. **Fetch**: `src/lib/github.ts` fetches releases from GitHub API (100 most recent)
2. **Parse**: `src/lib/parser.ts` extracts bulleted items, extracts platform prefixes (`VSCode:`, `[IDE]`)
3. **Categorize**: `src/lib/categorizer.ts` applies keyword-based rules to classify each item as feature/bug-fix/performance/security/improvement/misc
4. **Render**: All releases are pre-rendered in `src/pages/index.astro` as static HTML

### Client-Side Behavior

- **Filtering**: `src/scripts/app.ts` handles category pills, search, and pagination without page reloads
- **Version Check**: `src/scripts/toast.ts` polls `/version.json` every 2 minutes to notify of new releases
- **URL Sync**: Filter state persists in query params (`?category=feature&q=search`)

### Post-Build Step

The `postbuild` script (`scripts/generate-version.js`) fetches the latest release tag from GitHub and writes `dist/version.json` and `dist/latest.json`. This enables the client-side update notification system.

## Key Categorization Rules

The categorizer applies rules in priority order (see `src/lib/categorizer.ts`):

1. `^fix(ed)?` → bug-fix
2. `performance|faster|rendering` → performance
3. `security|secret|blocked|prevent` → security
4. `^(added|new)` or `is now available` → feature
5. `^improved?` → improvement
6. Default → misc

Note: "Fixed performance issue" is categorized as **bug-fix** (prefix wins).

## Testing

- Tests use **Vitest**
- Test files mirror source structure: `tests/lib/*.test.ts`
- Run individual test: `npm test -- categorizer.test.ts`

## Components

- `ReleaseCard.astro`: Individual release with version, date, tags, and change items
- `Sidebar.astro`: Desktop navigation with category counts
- `MobileNav.astro`: Mobile category pills
- `Layout.astro`: Base layout with fonts, Material Icons, global styles

## Deployment

Hosted on Vercel (see `vercel.json`). Framework detection is automatic. The build outputs to `dist/`.
