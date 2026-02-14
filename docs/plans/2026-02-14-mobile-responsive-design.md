# Mobile Responsive Design

## Overview

Make the Claude Code Release Notes Viewer mobile-friendly with appropriate breakpoints for phones and tablets. The desktop layout remains unchanged.

## Breakpoints

| Breakpoint | Target | Layout |
|---|---|---|
| Default (< 768px) | Phones | Single column, pills bar, search icon |
| 768px+ | Tablets | Single column, more spacious, centered cards |
| 1024px+ | Desktop | Current two-column sidebar layout (unchanged) |

Mobile-first CSS approach: base styles for mobile, `@media (min-width: 768px)` for tablet, `@media (min-width: 1024px)` to restore current desktop layout.

## Layout Structure (< 1024px)

```
┌──────────────────────┐
│ Header + search icon  │  ← sticky
├──────────────────────┤
│ [All] [Features] …   │  ← sticky, horizontal scroll pills
├──────────────────────┤
│ 32 releases · 4 mo   │  ← compact stats row
├──────────────────────┤
│ Release Card          │
│ Release Card          │
│ ...                   │
│ [Load More]           │
└──────────────────────┘
```

## Mobile Header & Search

- Left: HAL 9000 icon + compact title ("Claude Code" instead of full title)
- Right: Search icon (magnifying glass)
- Tapping search icon expands a full-width input over the header content with an X to dismiss
- Autofocus on expand, ESC or X to collapse
- `Cmd/Ctrl+K` shortcut still works on tablets with keyboards, but shortcut hint hidden on mobile
- Desktop search input hidden below 1024px; `.search-toggle` button shown instead
- Toggle a `.search-expanded` class on the header to manage visibility

## Category Pills Bar (< 1024px)

- Directly below header, sticky
- Horizontal scrolling row (`overflow-x: auto`, hidden scrollbar)
- Order: All, Features, Bug Fixes, Performance, Security, Improvements, Misc
- Active pill uses existing category highlight color
- Horizontal padding so pills don't touch screen edges
- `-webkit-overflow-scrolling: touch` for smooth iOS scrolling

## Stats Row (< 1024px)

- Below pills bar: `32 releases · 4 this month`
- Smaller font, muted color
- Informational, not prominent

## Sticky Behavior

- Header sticks to top, pills bar sticks below it
- ~90-100px total fixed top space on mobile

## Release Cards

### Phones (< 768px)
- Full-width, 16px horizontal padding
- Version + date on same line, slightly smaller font sizes
- Category tags: `flex-wrap: wrap` with smaller padding
- Copy icon always visible (no hover on touch devices)
- Tighter vertical gaps between cards (16px)
- Load More button: full-width

### Tablets (768px-1023px)
- Single column, 24px padding
- Cards max-width ~720px, centered
- More generous spacing than phone
- Load More button: centered, constrained width

## Files to Modify

- `src/pages/index.astro` — Media queries for page layout, pills bar markup
- `src/components/Sidebar.astro` — Extract category nav to render as pills on mobile, sidebar on desktop
- `src/components/ReleaseCard.astro` — Responsive card styles, tag reflow, copy icon visibility
- `src/layouts/Layout.astro` — Global responsive typography adjustments
- `src/scripts/app.ts` — Search toggle logic (event listener, class toggle)

## What Stays the Same

- All data fetching, parsing, categorization logic
- URL state management, pagination, toast notifications
- Desktop layout at 1024px+
- No new dependencies

## Testing

- Manual browser testing at 375px (phone), 768px (tablet), 1024px+ (desktop)
- Verify at each breakpoint: filtering, search, pagination, copy, keyboard shortcuts, toast
