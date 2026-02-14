# Mobile Responsive Design

## Overview

Make the Claude Code Release Notes Viewer mobile-friendly. Desktop layout remains unchanged. CSS strategy is desktop-first overrides — all existing styles stay untouched, responsive behavior added via `max-width` media queries.

## Breakpoints

| Breakpoint | Layout |
|---|---|
| < 1024px | Single column, pills bar, search icon, sticky header |
| 1024px+ | Current two-column sidebar layout (unchanged) |

Desktop-first approach: existing styles are the default, `@media (max-width: 1023px)` adds mobile/tablet overrides.

## Layout Structure (< 1024px)

```
┌──────────────────────────┐
│ ┌──────────────────────┐ │
│ │ Header + search icon  │ │  ← single sticky
│ ├──────────────────────┤ │    wrapper
│ │ [All] [Features] …   │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 32 releases · 4 this mo  │  ← compact stats row
├──────────────────────────┤
│ Release Card              │
│ Release Card              │
│ ...                       │
│ [Load More]               │
├──────────────────────────┤
│ Made with Pencil          │  ← attribution footer
└──────────────────────────┘
```

## Mobile Header & Search

- Left: HAL 9000 icon + compact title ("Claude Code" instead of full title)
- Right: Search icon button (magnifying glass), hidden at 1024px+
- Tapping search icon expands a full-width input over the header content with an X to dismiss
- Autofocus on expand, ESC or X to collapse
- Toggle a `.search-expanded` class on the header to manage visibility
- Desktop search input hidden below 1024px; `.search-toggle` button shown instead
- No keyboard shortcut on mobile — icon tap is sufficient
- Terminal typewriter block hidden below 1024px
- CRT/glitch title animations disabled below 1024px (keep static title styling)

## New Component: MobileNav.astro

Renders the pills bar and compact stats row. Hidden at 1024px+. Receives same category data props as Sidebar.

### Category Pills Bar
- Horizontal scrolling row (`overflow-x: auto`, hidden scrollbar)
- Order: All, Features, Bug Fixes, Performance, Security, Improvements, Misc
- Active pill uses existing category highlight color
- Horizontal padding so pills don't touch screen edges

### Compact Stats Row
- Below pills bar: `32 releases · 4 this month`
- Smaller font, muted color, not prominent

## Sticky Behavior

- Single sticky wrapper (`position: sticky; top: 0`) containing header + pills bar
- Avoids coordinating multiple sticky elements with hardcoded `top` values
- Search expansion pushes pills down naturally within the wrapper
- ~90-100px total sticky space

## Sidebar (< 1024px)

- Entire sidebar hidden below 1024px (`display: none`)
- Content margin-left reset to zero below 1024px
- Sidebar component itself unchanged

## Release Cards (< 1024px)

- Single set of styles for all viewports below 1024px
- Content area: `max-width: 720px; margin: 0 auto` (auto-centers on tablets, no effect on phones)
- 16px horizontal padding
- Version + date on same line, slightly smaller font sizes
- Category tags: `flex-wrap: wrap` with smaller padding
- Copy icon always visible (no hover on touch)
- Tighter vertical gaps between cards
- Load More button: full-width

## Toast Notification (< 1024px)

- Positioned below sticky area (~100px from top)
- Full-width with horizontal margin

## Attribution Footer (< 1024px)

- Pencil attribution moved to a simple footer below the release list
- One line, small text
- Hidden at 1024px+ (sidebar handles attribution on desktop)

## Files to Modify

- `src/pages/index.astro` — Sticky wrapper markup, mobile header with search toggle button, toast positioning, attribution footer
- `src/components/MobileNav.astro` — **New file**: pills bar + compact stats row (hidden at 1024px+)
- `src/components/Sidebar.astro` — Hide below 1024px (one media query)
- `src/components/ReleaseCard.astro` — Card responsive styles, copy button always visible
- `src/layouts/Layout.astro` — Content margin-left reset, disable CRT animations
- `src/scripts/app.ts` — Search toggle logic (event listener, class toggle, autofocus)

## What Stays the Same

- All data fetching, parsing, categorization logic
- URL state management, pagination
- Toast notification logic (just repositioned)
- Desktop layout at 1024px+
- Background image on all viewports
- No new dependencies

## Testing

- Manual browser testing at 375px (phone), 768px (tablet), 1024px+ (desktop)
- Verify at each breakpoint: filtering, search, pagination, copy, toast
- Verify search toggle: expand, autofocus, dismiss with X, dismiss with ESC
- Verify sticky behavior during scroll
- Verify category pills scroll horizontally
