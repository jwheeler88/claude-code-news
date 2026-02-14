# Mobile Responsive Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Claude Code Release Notes Viewer mobile-friendly with a single `<1024px` breakpoint using desktop-first CSS overrides.

**Architecture:** Desktop-first approach — all existing styles remain untouched. A single `@media (max-width: 1023px)` breakpoint hides the sidebar, replaces it with a horizontal pills bar + compact stats, restructures the header with a collapsible search toggle, and adjusts card layouts. One new component (`MobileNav.astro`) is added. JS changes are minimal: search toggle expand/dismiss and wiring mobile nav pills to the existing category filter.

**Tech Stack:** Astro, TypeScript, CSS media queries (no new dependencies)

---

### Task 1: Hide Sidebar Below 1024px

**Files:**
- Modify: `src/components/Sidebar.astro:69-244` (add media query at end of `<style>` block)
- Modify: `src/layouts/Layout.astro:32-73` (add media query to global styles)

**Step 1: Add sidebar hide media query**

At the end of the `<style>` block in `src/components/Sidebar.astro` (before the closing `</style>` tag on line 244), add:

```css
@media (max-width: 1023px) {
  .sidebar {
    display: none;
  }
}
```

**Step 2: Reset content margin and background offsets in Layout.astro**

At the end of the `<style is:global>` block in `src/layouts/Layout.astro` (before the closing `</style>` tag on line 73), add:

```css
@media (max-width: 1023px) {
  :root {
    --sidebar-width: 0px;
  }
}
```

This single override cascades everywhere `--sidebar-width` is used (content margin-left, background pseudo-element left offsets in index.astro).

**Step 3: Verify in browser**

Run: `npm run dev`
- Resize browser to <1024px: sidebar should disappear, content should fill full width
- Resize to 1024px+: sidebar should reappear, layout unchanged
- Background image and grain overlay should span full width on mobile

**Step 4: Commit**

```bash
git add src/components/Sidebar.astro src/layouts/Layout.astro
git commit -m "feat(mobile): hide sidebar below 1024px"
```

---

### Task 2: Create MobileNav Component (Pills Bar + Stats)

**Files:**
- Create: `src/components/MobileNav.astro`
- Modify: `src/pages/index.astro:1-6` (add import)
- Modify: `src/pages/index.astro:32-39` (add component to template)

**Step 1: Create the MobileNav.astro component**

Create `src/components/MobileNav.astro`:

```astro
---
interface CategoryNav {
  label: string;
  value: string;
  count: number;
}

interface Props {
  categories: CategoryNav[];
  totalReleases: number;
  thisMonthCount: number;
}

const { categories, totalReleases, thisMonthCount } = Astro.props;
---
<div class="mobile-nav">
  <div class="pills-bar">
    <button class="pill active" data-category="all">All</button>
    {categories.map((cat) => (
      <button class="pill" data-category={cat.value}>{cat.label}</button>
    ))}
  </div>
  <div class="mobile-stats">
    {totalReleases} releases &middot; {thisMonthCount} this month
  </div>
</div>

<style>
  .mobile-nav {
    display: none;
  }

  @media (max-width: 1023px) {
    .mobile-nav {
      display: block;
    }

    .pills-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 0 16px 8px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .pills-bar::-webkit-scrollbar {
      display: none;
    }

    .pill {
      flex-shrink: 0;
      padding: 6px 14px;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      background: transparent;
      color: var(--color-text-muted);
      font-family: var(--font-body);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .pill:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }

    .pill.active {
      background: var(--color-accent-dim);
      color: var(--color-accent);
      border-color: var(--color-accent);
    }

    .mobile-stats {
      padding: 4px 16px 0;
      font-size: 12px;
      color: var(--color-text-muted);
    }
  }
</style>
```

**Step 2: Import and render MobileNav in index.astro**

In `src/pages/index.astro`, add the import at line 4 (after the ReleaseCard import):

```typescript
import MobileNav from "../components/MobileNav.astro";
```

Then, inside the `<Layout>` tag, add the MobileNav right before `<main class="content">` (after the Sidebar closing tag, around line 39):

```astro
<MobileNav
  categories={categoryCounts}
  totalReleases={releases.length}
  thisMonthCount={thisMonthCount}
/>
```

**Step 3: Verify in browser**

- At <1024px: pills bar should be visible with horizontal scrolling, stats row below
- At 1024px+: MobileNav should be completely hidden
- Pills should scroll horizontally without visible scrollbar
- Active "All" pill should have red accent styling

**Step 4: Commit**

```bash
git add src/components/MobileNav.astro src/pages/index.astro
git commit -m "feat(mobile): add MobileNav with category pills and compact stats"
```

---

### Task 3: Mobile Header with Search Toggle

**Files:**
- Modify: `src/pages/index.astro:40-62` (restructure header markup)
- Modify: `src/pages/index.astro:90-511` (add mobile styles in `<style>` block)

**Step 1: Add search toggle button to header**

In `src/pages/index.astro`, inside the `<header class="content-header">`, add a search toggle button right after the `<div class="header-text">` closing tag (after line 50, before the `<div class="search-wrapper">`):

```html
<button class="search-toggle" id="search-toggle" aria-label="Search">
  <span class="material-symbols-sharp">search</span>
</button>
```

**Step 2: Add mobile header styles**

At the end of the `<style>` block in `src/pages/index.astro` (before `</style>`), add:

```css
/* Search toggle button — hidden on desktop, shown on mobile */
.search-toggle {
  display: none;
}

@media (max-width: 1023px) {
  .content {
    padding: 0 16px 24px;
  }

  .content-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-bg);
    padding: 12px 0;
    margin-bottom: 0;
    flex-wrap: wrap;
  }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .title-row {
    gap: 8px;
  }

  .page-title {
    font-size: 16px;
    animation: none;
    text-shadow: none;
    padding: 0;
    margin: 0;
    -webkit-mask-image: none;
    mask-image: none;
  }

  .page-title::before,
  .page-title::after,
  .crt-sweep {
    display: none;
  }

  .title-text {
    /* Shorter title on mobile — handled via content swap in markup */
  }

  .terminal-block {
    display: none;
  }

  .search-wrapper {
    display: none;
  }

  .search-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 8px;
    flex-shrink: 0;
  }

  .search-toggle .material-symbols-sharp {
    font-size: 24px;
  }

  /* Expanded search state */
  .content-header.search-expanded .header-text,
  .content-header.search-expanded .search-toggle {
    display: none;
  }

  .content-header.search-expanded .search-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .content-header.search-expanded .search-input {
    width: 100%;
    padding-right: 40px;
  }

  .content-header.search-expanded .search-kbd {
    display: none;
  }

  .mobile-search-close {
    display: none;
  }

  .content-header.search-expanded .mobile-search-close {
    display: flex;
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 4px;
  }
}
```

**Step 3: Add close button to search wrapper**

In `src/pages/index.astro`, inside the `<div class="search-wrapper">`, after the `<kbd>` element, add:

```html
<button class="mobile-search-close" id="mobile-search-close" aria-label="Close search">
  <span class="material-symbols-sharp">close</span>
</button>
```

**Step 4: Replace the full title with a shorter mobile-friendly version**

In `src/pages/index.astro`, replace the title `<span>` content. Change the existing `<h1>` to include both a desktop and mobile title:

Replace the existing `<h1>` line:
```html
<h1 class="page-title"><span class="title-text">I'm sorry, Dave. I can't let you read that changelog.</span><span class="crt-sweep"></span></h1>
```

With:
```html
<h1 class="page-title"><span class="title-text"><span class="title-desktop">I'm sorry, Dave. I can't let you read that changelog.</span><span class="title-mobile">Claude Code</span></span><span class="crt-sweep"></span></h1>
```

Then add to the mobile styles block:

```css
.title-mobile {
  display: none;
}

@media (max-width: 1023px) {
  .title-desktop {
    display: none;
  }

  .title-mobile {
    display: inline;
  }
}
```

Note: Add `.title-mobile` hide to the main (non-media-query) styles area, and the media query swap inside the existing `@media (max-width: 1023px)` block.

**Step 5: Verify in browser**

- At <1024px: compact "Claude Code" title with HAL icon + search icon button
- Terminal block hidden
- CRT animations disabled (no glitch, no scanlines)
- Search toggle button visible
- At 1024px+: full title, CRT effects, search input, terminal block — all unchanged

**Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(mobile): restructure header with search toggle and compact title"
```

---

### Task 4: Search Toggle JavaScript

**Files:**
- Modify: `src/scripts/app.ts:118-134` (add search toggle logic after existing keyboard handlers)

**Step 1: Add search toggle event listeners**

At the end of `src/scripts/app.ts` (before the `initFromURL()` call on line 178), add:

```typescript
// Mobile search toggle
const searchToggle = document.getElementById("search-toggle");
const mobileSearchClose = document.getElementById("mobile-search-close");
const contentHeader = document.querySelector(".content-header");

if (searchToggle && mobileSearchClose && contentHeader) {
  searchToggle.addEventListener("click", () => {
    contentHeader.classList.add("search-expanded");
    searchInput.focus();
  });

  mobileSearchClose.addEventListener("click", () => {
    contentHeader.classList.remove("search-expanded");
  });

  // ESC also closes mobile search
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contentHeader.classList.contains("search-expanded")) {
      contentHeader.classList.remove("search-expanded");
    }
  });
}
```

Note: The existing ESC handler (lines 127-134) clears the search value. This new handler additionally closes the mobile overlay. Both can coexist — ESC clears value AND closes the expanded panel.

**Step 2: Verify in browser**

- At <1024px: tap search icon → input expands over header, autofocuses
- Type a query → releases filter
- Tap X → search closes, query preserved in the hidden input
- Press ESC → search closes and clears
- At 1024px+: no behavior change, toggle button hidden

**Step 3: Commit**

```bash
git add src/scripts/app.ts
git commit -m "feat(mobile): add search toggle expand/collapse logic"
```

---

### Task 5: Wire Mobile Nav Pills to Category Filter

**Files:**
- Modify: `src/scripts/app.ts:96-105` (extend category nav handler to include mobile pills)

**Step 1: Update category navigation to include mobile pills**

In `src/scripts/app.ts`, the existing `navItems` selector on line 11 only matches `.nav-item` (sidebar). We need to also handle `.pill` clicks from MobileNav.

Replace the `navItems` declaration and its click handler (lines 11 and 97-105).

Change line 11 from:
```typescript
const navItems = document.querySelectorAll<HTMLButtonElement>(".nav-item");
```
To:
```typescript
const navItems = document.querySelectorAll<HTMLButtonElement>(".nav-item");
const mobileNavPills = document.querySelectorAll<HTMLButtonElement>(".pill");
```

Then replace the category navigation click handler (lines 97-105):

```typescript
// Category navigation — sync sidebar and mobile pills
function setActiveCategory(category: string): void {
  activeCategory = category;
  navItems.forEach((b) => b.classList.toggle("active", b.dataset.category === category));
  mobileNavPills.forEach((b) => b.classList.toggle("active", b.dataset.category === category));
  visibleCount = BATCH_SIZE;
  render();
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => setActiveCategory(btn.dataset.category || "all"));
});

mobileNavPills.forEach((btn) => {
  btn.addEventListener("click", () => setActiveCategory(btn.dataset.category || "all"));
});
```

**Step 2: Verify in browser**

- At <1024px: tapping a pill filters releases, active pill highlights
- Switching category resets pagination (Load More starts over)
- URL params update when category changes
- At 1024px+: sidebar nav still works identically

**Step 3: Commit**

```bash
git add src/scripts/app.ts
git commit -m "feat(mobile): wire mobile nav pills to category filter"
```

---

### Task 6: Sticky Header Wrapper

**Files:**
- Modify: `src/pages/index.astro:32-84` (wrap header + MobileNav in sticky container)

**Step 1: Add sticky wrapper markup**

In `src/pages/index.astro`, wrap the `<header class="content-header">` and the `<MobileNav>` component in a sticky container. The structure should become:

```astro
<main class="content">
  <div class="sticky-header" id="sticky-header">
    <header class="content-header">
      <!-- existing header content unchanged -->
    </header>
  </div>

  <!-- MobileNav moves inside main, after sticky-header -->
  <div class="mobile-nav-wrapper">
    <MobileNav
      categories={categoryCounts}
      totalReleases={releases.length}
      thisMonthCount={thisMonthCount}
    />
  </div>

  <div id="release-list" class="release-list">
```

Wait — per the spec, the sticky wrapper should contain BOTH the header and the pills bar. Let me correct:

```astro
<main class="content">
  <div class="sticky-header">
    <header class="content-header">
      <!-- existing header content unchanged -->
    </header>
    <MobileNav
      categories={categoryCounts}
      totalReleases={releases.length}
      thisMonthCount={thisMonthCount}
    />
  </div>

  <div id="release-list" class="release-list">
```

So move MobileNav from before `<main>` to inside `<main>`, inside a new `.sticky-header` div that also wraps the `<header>`.

**Step 2: Add sticky header styles**

Add to the `<style>` block in `src/pages/index.astro`:

```css
.sticky-header {
  /* No-op on desktop */
}

@media (max-width: 1023px) {
  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-bg);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border);
    margin: 0 -16px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .content-header {
    position: static;
    background: transparent;
  }
}
```

Note: Move the `position: sticky`, `z-index`, and `background` from the `.content-header` mobile override (added in Task 3) to `.sticky-header` instead. Update the Task 3 mobile `.content-header` to be `position: static` since the sticky behavior is now on the parent wrapper.

**Step 3: Verify in browser**

- At <1024px: scroll down — header + pills bar stick to top together
- Search expansion pushes pills down within the sticky area
- At 1024px+: no visual change

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(mobile): add sticky header wrapper for header + pills"
```

---

### Task 7: Release Card Mobile Styles

**Files:**
- Modify: `src/components/ReleaseCard.astro:64-242` (add media query at end of style block)

**Step 1: Add responsive card styles**

At the end of the `<style>` block in `src/components/ReleaseCard.astro` (before `</style>`), add:

```css
@media (max-width: 1023px) {
  .release-card {
    padding: 16px;
    border-radius: 10px;
  }

  .card-header {
    margin-bottom: 12px;
  }

  .version {
    font-size: 17px;
  }

  .tag {
    font-size: 10px;
    padding: 2px 6px;
  }

  .change-item {
    padding: 6px 8px;
  }

  .copy-btn {
    opacity: 1;
  }
}
```

**Step 2: Add content area centering for tablets**

In `src/pages/index.astro`, add to the existing `@media (max-width: 1023px)` block:

```css
.release-list {
  max-width: 720px;
  margin: 0 auto;
  gap: 12px;
}

.load-more-container {
  max-width: 720px;
  margin: 16px auto 0;
}

.load-more-btn {
  width: 100%;
}
```

**Step 3: Verify in browser**

- At 375px (phone): cards fill width with 16px padding, copy icon always visible
- At 768px (tablet): cards centered with max-width 720px
- Tags wrap if many categories
- Load More button is full width
- At 1024px+: cards unchanged

**Step 4: Commit**

```bash
git add src/components/ReleaseCard.astro src/pages/index.astro
git commit -m "feat(mobile): responsive release card styles and content centering"
```

---

### Task 8: Toast and Attribution Mobile Styles

**Files:**
- Modify: `src/pages/index.astro` (toast mobile styles + attribution footer markup + styles)

**Step 1: Add attribution footer markup**

In `src/pages/index.astro`, after the `<div id="load-more-container">` closing tag and before the `</main>` closing tag, add:

```html
<footer class="mobile-attribution">
  <a href="https://pencil.dev" target="_blank" rel="noopener noreferrer">
    Designed with Pencil
  </a>
</footer>
```

**Step 2: Add toast and attribution mobile styles**

Add to the `@media (max-width: 1023px)` block in the `<style>` section:

```css
.toast {
  bottom: auto;
  top: 100px;
  right: 16px;
  left: 16px;
}

.mobile-attribution {
  display: block;
  text-align: center;
  padding: 24px 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.mobile-attribution a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.mobile-attribution a:hover {
  color: var(--color-accent);
}
```

And in the non-media-query styles:

```css
.mobile-attribution {
  display: none;
}
```

**Step 3: Verify in browser**

- At <1024px: toast appears near top (below sticky area), full width with margins
- Attribution footer visible below release list
- At 1024px+: toast in bottom-right, attribution hidden (sidebar has it)

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(mobile): reposition toast and add attribution footer"
```

---

### Task 9: Init Mobile State from URL Params

**Files:**
- Modify: `src/scripts/app.ts:158-178` (update `initFromURL` to sync mobile pills)

**Step 1: Update initFromURL to set active mobile pill**

In `src/scripts/app.ts`, the existing `initFromURL` function (lines 158-178) sets `activeCategory` and toggles `.active` on `navItems`. Update it to also toggle on `mobileNavPills`.

In the `if (cat)` block, after the `navItems.forEach` call, add:

```typescript
mobileNavPills.forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.category === cat);
});
```

And for the default "all" state (when no `cat` param), ensure the "all" pill is active. The default HTML already has `class="pill active"` on the All button, so this only matters when navigating with a `?category=` param.

**Step 2: Verify in browser**

- Navigate to `/?category=feature` at <1024px: "Features" pill should be active
- Navigate to `/?q=search`: search value populated (mobile search stays collapsed but filter applies)

**Step 3: Commit**

```bash
git add src/scripts/app.ts
git commit -m "feat(mobile): sync mobile nav pills with URL params on init"
```

---

### Task 10: Final Polish and Cross-Breakpoint Testing

**Files:**
- Potentially tweak any files from Tasks 1-9

**Step 1: Full manual test at 375px (phone)**

Run: `npm run dev`

Check all of:
- [ ] Sidebar hidden
- [ ] Compact "Claude Code" title with HAL icon
- [ ] Search toggle icon visible, expands/collapses correctly
- [ ] Category pills scroll horizontally
- [ ] Tapping pill filters releases
- [ ] Stats row shows correct counts
- [ ] Cards fill width, copy icon visible
- [ ] Load More button full width
- [ ] Toast positioned below sticky header
- [ ] Attribution footer visible
- [ ] Sticky header works during scroll
- [ ] Background image spans full width

**Step 2: Test at 768px (tablet)**

- [ ] Same as phone but cards centered at max-width 720px
- [ ] Pills still horizontally scrollable

**Step 3: Test at 1024px (breakpoint boundary)**

- [ ] Sidebar reappears
- [ ] Full title with CRT effects
- [ ] Desktop search input
- [ ] Terminal block
- [ ] Mobile nav hidden
- [ ] Attribution footer hidden
- [ ] Toast in bottom-right

**Step 4: Test at 1440px (desktop)**

- [ ] Everything identical to current production

**Step 5: Fix any issues found**

Address any visual bugs, spacing inconsistencies, or interaction problems discovered during testing.

**Step 6: Build check**

Run: `npm run build`
Expected: Clean build with no errors

**Step 7: Final commit**

```bash
git add -A
git commit -m "fix(mobile): polish responsive layout after cross-breakpoint testing"
```

(Only if changes were needed in Step 5. Skip if nothing to fix.)
