# UI Polish & Animations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate the release notes SPA from functional to remarkable by adding micro-animations, search highlighting, contextual stats, and interaction polish across all 7 review findings.

**Architecture:** All changes are client-side. Tasks 1-4 modify `src/scripts/app.ts` (the main client runtime). Tasks 5-7 touch component styles and markup. No new dependencies — everything uses CSS transitions/animations and vanilla JS. Each task is independent and can be committed separately.

**Tech Stack:** Astro (static site), TypeScript (client scripts), CSS animations/transitions, IntersectionObserver API

---

### Task 1: Card Filter & Search Transitions

**Problem:** Cards appear/disappear via `display:none` with zero animation — jarring snap transitions.

**Files:**
- Modify: `src/scripts/app.ts` (the `render()` and `filterItems()` functions)
- Modify: `src/pages/index.astro` (add CSS transition classes in the `<style>` block, lines 471-475 area)

**Step 1: Add CSS transition classes to `src/pages/index.astro`**

Add these styles inside the existing `<style>` block, after the `.release-list` rule (after line 475):

```css
.release-wrapper {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.release-wrapper.fade-out {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}

.release-wrapper.fade-in {
  opacity: 0;
  transform: translateY(8px);
}
```

**Step 2: Update the `render()` function in `src/scripts/app.ts`**

Replace the current `render()` function (lines 89-111) with a version that uses CSS transitions instead of instant `display` toggling:

```typescript
function render(): void {
  const matching = getMatchingWrappers();

  // Phase 1: fade out wrappers that should hide
  releaseWrappers.forEach((w) => {
    const shouldShow = matching.indexOf(w) !== -1 && matching.indexOf(w) < visibleCount;
    if (!shouldShow && w.style.display !== "none") {
      w.classList.add("fade-out");
    }
  });

  // Phase 2: after fade-out completes, hide them and show new ones
  setTimeout(() => {
    releaseWrappers.forEach((w) => {
      w.classList.remove("fade-out");
      w.style.display = "none";
    });

    matching.forEach((w, i) => {
      if (i < visibleCount) {
        const wasHidden = w.style.display === "none";
        w.style.display = "";
        filterItems(w);
        if (wasHidden) {
          w.classList.add("fade-in");
          // Stagger: 30ms per card
          setTimeout(() => w.classList.remove("fade-in"), 30 * (i + 1));
        }
      }
    });

    // Load more button
    loadMoreContainer.style.display = matching.length > visibleCount ? "" : "none";
  }, 150); // matches fade-out duration

  // Update URL (immediate, don't wait for animation)
  const params = new URLSearchParams();
  if (activeCategory !== "all") params.set("category", activeCategory);
  if (searchQuery) params.set("q", searchQuery);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, "", url);
}
```

**Step 3: Build and visually verify**

Run: `npm run dev`
Expected: Switching categories shows a subtle fade-out then staggered fade-in of cards.

**Step 4: Commit**

```bash
git add src/scripts/app.ts src/pages/index.astro
git commit -m "feat: add fade transitions for card filter/search"
```

---

### Task 2: Search Term Highlighting

**Problem:** Searching "OAuth" shows matching cards but doesn't highlight the matched text within items.

**Files:**
- Modify: `src/scripts/app.ts` (add highlight/unhighlight functions, call in `filterItems()`)

**Step 1: Add highlight utility functions at the top of `src/scripts/app.ts`**

Add after the existing variable declarations (after line 13):

```typescript
function highlightText(el: HTMLElement, query: string): void {
  clearHighlight(el);
  if (!query) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const matches: { node: Text; index: number }[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const idx = node.textContent?.toLowerCase().indexOf(query) ?? -1;
    if (idx !== -1) {
      matches.push({ node, index: idx });
    }
  }

  // Process in reverse so indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const { node, index } = matches[i];
    const text = node.textContent!;
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    const mark = document.createElement("mark");
    mark.className = "search-highlight";
    mark.textContent = match;

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(mark);
    if (after) frag.appendChild(document.createTextNode(after));

    node.parentNode!.replaceChild(frag, node);
  }
}

function clearHighlight(el: HTMLElement): void {
  el.querySelectorAll("mark.search-highlight").forEach((mark) => {
    const parent = mark.parentNode!;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}
```

**Step 2: Call highlighting inside `filterItems()` in `src/scripts/app.ts`**

At the end of the `filterItems()` function (before the closing `}`), add:

```typescript
  // Highlight search matches in visible items
  items.forEach((item) => {
    const textEl = item.querySelector(".item-text") as HTMLElement;
    if (textEl) {
      if (item.style.display !== "none" && searchQuery) {
        highlightText(textEl, searchQuery);
      } else {
        clearHighlight(textEl);
      }
    }
  });
```

**Step 3: Add the highlight style to `src/pages/index.astro`**

Add in the `<style>` block (after the `.release-list` rule):

```css
:global(.search-highlight) {
  background: rgba(204, 0, 0, 0.25);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
```

**Step 4: Build and visually verify**

Run: `npm run dev`
Search for "OAuth". Expected: The word "OAuth" is highlighted with a subtle red background in every matching item.

**Step 5: Commit**

```bash
git add src/scripts/app.ts src/pages/index.astro
git commit -m "feat: highlight search terms in matching results"
```

---

### Task 3: Enhanced "Load More" Button

**Problem:** The button shows plain "Load more" with no count, no transition when new cards appear, and no scroll management.

**Files:**
- Modify: `src/scripts/app.ts` (update `render()` to set remaining count, improve load-more click handler)
- Modify: `src/pages/index.astro` (update button markup and style)

**Step 1: Update the button markup in `src/pages/index.astro`**

Replace line 88:
```html
<button id="load-more-btn" class="load-more-btn">Load more</button>
```
with:
```html
<button id="load-more-btn" class="load-more-btn">
  Load more <span id="load-more-count" class="load-more-count"></span>
</button>
```

**Step 2: Add the count style in `src/pages/index.astro`**

Add after the `.load-more-btn:hover` rule (after line 497):

```css
.load-more-count {
  color: var(--color-text-muted);
  font-size: 13px;
  margin-left: 4px;
}
```

**Step 3: Update `render()` in `src/scripts/app.ts` to show remaining count**

Add a reference at the top with other element refs (after line 10):

```typescript
const loadMoreCount = document.getElementById("load-more-count")!;
```

Inside `render()`, where the load-more visibility is set, replace the simple display toggle with:

```typescript
const remaining = matching.length - visibleCount;
if (remaining > 0) {
  loadMoreContainer.style.display = "";
  loadMoreCount.textContent = `\u00B7 ${remaining} remaining`;
} else {
  loadMoreContainer.style.display = "none";
}
```

**Step 4: Update the load-more click handler to scroll to new content**

Replace the existing click handler (lines 160-163) with:

```typescript
loadMoreBtn.addEventListener("click", () => {
  const previousCount = visibleCount;
  visibleCount += BATCH_SIZE;
  render();

  // Scroll to the first newly revealed card
  const matching = getMatchingWrappers();
  const firstNew = matching[previousCount];
  if (firstNew) {
    setTimeout(() => {
      firstNew.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }
});
```

**Step 5: Build and visually verify**

Run: `npm run dev`
Scroll to bottom. Expected: Button says "Load more · 26 remaining". Clicking scrolls to first new card.

**Step 6: Commit**

```bash
git add src/scripts/app.ts src/pages/index.astro
git commit -m "feat: load-more button shows remaining count and auto-scrolls"
```

---

### Task 4: Scroll-Driven Card Entrance Animations

**Problem:** All cards below the fold are fully visible the instant they enter the viewport — no sense of entrance.

**Files:**
- Modify: `src/scripts/app.ts` (add IntersectionObserver setup)
- Modify: `src/pages/index.astro` (add entrance CSS)

**Step 1: Add entrance animation CSS to `src/pages/index.astro`**

Add in the `<style>` block after the `.release-list` rule:

```css
.release-wrapper {
  opacity: 1;
  transform: translateY(0);
}

.release-wrapper.observe-entrance {
  opacity: 0;
  transform: translateY(12px);
}

.release-wrapper.entered {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

Note: If Task 1 already added a `.release-wrapper` rule with transitions, merge the properties — use `observe-entrance` as the pre-animation state and `entered` as the post-animation state. The Task 1 `fade-in`/`fade-out` classes are for filter transitions; these `observe-entrance`/`entered` classes are for scroll-driven entrance.

**Step 2: Add the IntersectionObserver at the end of `src/scripts/app.ts`**

Add before `initFromURL();` (before the last line):

```typescript
// Scroll-driven entrance animations
const entranceObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        el.classList.remove("observe-entrance");
        el.classList.add("entered");
        entranceObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.1 }
);

function observeNewCards(): void {
  releaseWrappers.forEach((w) => {
    if (w.style.display !== "none" && !w.classList.contains("entered")) {
      w.classList.add("observe-entrance");
      entranceObserver.observe(w);
    }
  });
}
```

**Step 3: Call `observeNewCards()` after rendering**

Inside the `render()` function, at the very end (after URL update), add:

```typescript
  // Set up entrance animations for newly visible cards
  requestAnimationFrame(() => observeNewCards());
```

**Step 4: Build and visually verify**

Run: `npm run dev`
Scroll down the page. Expected: Cards that were below the fold fade in with a subtle upward slide as you scroll to them.

**Step 5: Commit**

```bash
git add src/scripts/app.ts src/pages/index.astro
git commit -m "feat: add scroll-driven entrance animations for release cards"
```

---

### Task 5: Enhanced Card Hover States

**Problem:** Hover effect is just a faint red left-border — nearly invisible. No depth or dimensionality.

**Files:**
- Modify: `src/components/ReleaseCard.astro` (update `.release-card` and `.change-item:hover` styles)

**Step 1: Add transition properties to `.release-card` in `src/components/ReleaseCard.astro`**

Find the `.release-card` rule (lines 65-72) and replace with:

```css
.release-card {
  background: rgba(20, 20, 20, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.release-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(204, 0, 0, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}
```

**Step 2: Enhance the `.change-item:hover` in `src/components/ReleaseCard.astro`**

Find the `.change-item:hover` rule (lines 170-173) and replace with:

```css
.change-item:hover {
  background: var(--color-surface-hover);
  border-left-color: var(--color-accent);
  transform: translateX(2px);
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
```

**Step 3: Add a "big release" visual indicator**

In `src/components/ReleaseCard.astro`, update the `<article>` tag (line 33) to include item count as a data attribute:

```astro
<article class="release-card" data-version={release.version} data-categories={JSON.stringify(uniqueCategories)} data-item-count={release.items.length}>
```

Then add this CSS rule:

```css
.release-card[data-item-count] {
  --glow: 0;
}

/* Releases with 8+ items get a subtle accent glow */
.release-card:hover {
  --glow: 0;
}
```

Actually, keep it simpler — CSS can't read numeric data attributes conditionally. Instead, add a class in the Astro template. Update line 33:

```astro
<article class={`release-card ${release.items.length >= 8 ? 'release-major' : ''}`} data-version={release.version} data-categories={JSON.stringify(uniqueCategories)}>
```

Add this CSS:

```css
.release-major {
  border-left: 2px solid rgba(204, 0, 0, 0.2);
}

.release-major:hover {
  border-left-color: rgba(204, 0, 0, 0.5);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(204, 0, 0, 0.06);
}
```

**Step 4: Disable card hover lift on mobile**

Add inside the existing `@media (max-width: 1023px)` block in `ReleaseCard.astro`:

```css
.release-card:hover {
  transform: none;
  box-shadow: none;
}
```

**Step 5: Build and visually verify**

Run: `npm run dev`
Hover over cards. Expected: Subtle lift with shadow. Major releases (8+ items) have a red left accent.

**Step 6: Commit**

```bash
git add src/components/ReleaseCard.astro
git commit -m "feat: enhance card hover states with lift and major-release indicator"
```

---

### Task 6: Context-Aware Sidebar Stats

**Problem:** The stats box always shows static global stats regardless of active filter or search.

**Files:**
- Modify: `src/components/Sidebar.astro` (add an ID to the stats container and labels)
- Modify: `src/scripts/app.ts` (update stats on render)

**Step 1: Add IDs to the stats box in `src/components/Sidebar.astro`**

Replace the stats box markup (lines 45-58) with:

```astro
<div class="stats-box" id="stats-box">
  <div class="stat">
    <span class="stat-value stat-green" id="stat-primary-value">{thisMonthCount}</span>
    <span class="stat-label" id="stat-primary-label">This Month</span>
  </div>
  <div class="stat">
    <span class="stat-value" id="stat-secondary-value">{totalReleases}</span>
    <span class="stat-label" id="stat-secondary-label">Total Releases</span>
  </div>
  <div class="stat">
    <span class="stat-value" id="stat-tertiary-value">{latestVersion}</span>
    <span class="stat-label" id="stat-tertiary-label">Latest Version</span>
  </div>
</div>
```

**Step 2: Add a CSS transition for smooth number changes in `src/components/Sidebar.astro`**

Add to the existing `.stat-value` rule:

```css
.stat-value {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  transition: opacity 0.15s;
}
```

**Step 3: Update stats dynamically in `src/scripts/app.ts`**

Add element refs at the top (with other DOM refs):

```typescript
const statPrimaryValue = document.getElementById("stat-primary-value");
const statPrimaryLabel = document.getElementById("stat-primary-label");
const statSecondaryValue = document.getElementById("stat-secondary-value");
const statSecondaryLabel = document.getElementById("stat-secondary-label");
```

Add a helper function after `render()`:

```typescript
function updateStats(): void {
  if (!statPrimaryValue || !statPrimaryLabel || !statSecondaryValue || !statSecondaryLabel) return;

  const matching = getMatchingWrappers();
  const matchCount = matching.length;

  if (searchQuery) {
    // Search mode: show result count
    const totalItems = matching.reduce((sum, w) => {
      return sum + Array.from(w.querySelectorAll<HTMLElement>(".change-item")).filter(
        (item) => item.style.display !== "none"
      ).length;
    }, 0);
    statPrimaryValue.textContent = String(totalItems);
    statPrimaryLabel.textContent = `Results for "${searchQuery}"`;
    statSecondaryValue.textContent = String(matchCount);
    statSecondaryLabel.textContent = "Releases Matched";
  } else if (activeCategory !== "all") {
    // Category mode: show category-specific stats
    const totalItems = matching.reduce((sum, w) => {
      return sum + Array.from(w.querySelectorAll<HTMLElement>(".change-item")).filter(
        (item) => item.style.display !== "none"
      ).length;
    }, 0);
    const label = document.querySelector(`.nav-item.active .nav-label`)?.textContent || activeCategory;
    statPrimaryValue.textContent = String(totalItems);
    statPrimaryLabel.textContent = `${label} Items`;
    statSecondaryValue.textContent = String(matchCount);
    statSecondaryLabel.textContent = "Releases";
  } else {
    // Default: restore original values
    const thisMonth = document.querySelectorAll<HTMLElement>(".release-wrapper").length;
    // Use data attributes to store original values (set at init)
    statPrimaryValue.textContent = statPrimaryValue.dataset.original || "";
    statPrimaryLabel.textContent = "This Month";
    statSecondaryValue.textContent = statSecondaryLabel.dataset.originalCount || "";
    statSecondaryLabel.textContent = "Total Releases";
  }
}
```

**Step 4: Store original values and call `updateStats()` in render**

At the top of `initFromURL()`, before calling `render()`, add:

```typescript
  // Store original stats values for reset
  if (statPrimaryValue) statPrimaryValue.dataset.original = statPrimaryValue.textContent || "";
  if (statSecondaryLabel) statSecondaryLabel.dataset.originalCount = statSecondaryValue?.textContent || "";
```

At the end of `render()`, add:

```typescript
  updateStats();
```

**Step 5: Build and visually verify**

Run: `npm run dev`
Click "Bug Fixes". Expected: Stats box updates to show "33 Bug Fixes Items" / "18 Releases". Search "OAuth". Expected: "7 Results for oauth" / "5 Releases Matched".

**Step 6: Commit**

```bash
git add src/components/Sidebar.astro src/scripts/app.ts
git commit -m "feat: context-aware sidebar stats respond to filter/search"
```

---

### Task 7: Copy-to-Clipboard Feedback Polish

**Problem:** The copy icon swaps instantly with no animation — functional but forgettable.

**Files:**
- Modify: `src/scripts/app.ts` (enhance the copy handler)
- Modify: `src/components/ReleaseCard.astro` (add animation CSS)

**Step 1: Add the pulse animation CSS in `src/components/ReleaseCard.astro`**

Add after the `.copy-btn:hover` rule:

```css
@keyframes copy-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.copy-btn.copied {
  color: #22c55e;
  animation: copy-pulse 0.3s ease;
}
```

**Step 2: Update the copy handler in `src/scripts/app.ts`**

Replace the existing copy handler (lines 166-178) with:

```typescript
// Copy to clipboard with feedback animation
releaseList.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement;
  if (!btn) return;

  const text = btn.dataset.copy || "";
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector(".material-symbols-sharp");
    if (icon) {
      icon.textContent = "check";
      btn.classList.add("copied");

      setTimeout(() => {
        icon.textContent = "content_copy";
        btn.classList.remove("copied");
      }, 1500);
    }
  });
});
```

**Step 3: Build and visually verify**

Run: `npm run dev`
Click a copy button. Expected: Icon turns green with a brief scale pulse, then reverts after 1.5s.

**Step 4: Commit**

```bash
git add src/components/ReleaseCard.astro src/scripts/app.ts
git commit -m "feat: add pulse animation to copy-to-clipboard feedback"
```

---

### Task 8: Mobile Brand Identity Touch

**Problem:** Mobile strips all HAL 9000 personality — no animations, no red glow, pure utility.

**Files:**
- Modify: `src/pages/index.astro` (add a mobile title glitch on load, inside the mobile `@media` block)

**Step 1: Add a one-shot mobile title animation in `src/pages/index.astro`**

Inside the `@media (max-width: 1023px)` block, after the `.page-title` rule that strips desktop animations (around line 590), add:

```css
@keyframes mobile-glitch {
  0% { opacity: 0; transform: translateX(-4px); }
  15% { opacity: 1; transform: translateX(2px); text-shadow: 2px 0 rgba(204, 0, 0, 0.6), -2px 0 rgba(6, 182, 212, 0.6); }
  30% { transform: translateX(-1px); text-shadow: -1px 0 rgba(204, 0, 0, 0.4), 1px 0 rgba(6, 182, 212, 0.4); }
  50% { transform: translateX(0); text-shadow: none; }
  100% { transform: translateX(0); text-shadow: none; opacity: 1; }
}

.title-mobile {
  animation: mobile-glitch 0.6s ease-out;
}
```

**Step 2: Add a subtle red accent line under the mobile header**

In the `@media (max-width: 1023px)` block, update the `.sticky-header` rule (around line 562):

Find:
```css
border-bottom: 1px solid var(--color-border);
```
Replace with:
```css
border-bottom: 1px solid var(--color-border);
background-image: linear-gradient(to right, transparent, rgba(204, 0, 0, 0.15), transparent);
background-size: 100% 1px;
background-position: bottom;
background-repeat: no-repeat;
```

**Step 3: Build and visually verify on mobile viewport**

Run: `npm run dev` and resize to 390px width.
Expected: Title briefly glitches in on load. Header has a faint red gradient underline.

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add mobile brand identity with title glitch and red accent"
```

---

### Task 9: Final Integration Verification

**Step 1: Run existing tests to ensure no regressions**

Run: `npm test`
Expected: All tests pass (categorizer, parser, github tests).

**Step 2: Run production build**

Run: `npm run build`
Expected: Build completes without errors.

**Step 3: Visual smoke test on dev server**

Run: `npm run dev` and verify:
- [ ] Page loads with card entrance animations
- [ ] Clicking category pills triggers fade-out / staggered fade-in
- [ ] Search highlights matching text in red
- [ ] Load more button shows remaining count
- [ ] Load more scrolls to first new card
- [ ] Card hover shows subtle lift with shadow
- [ ] Major releases (8+ items) have red left accent
- [ ] Sidebar stats update when filtering/searching
- [ ] Sidebar stats reset to defaults when clearing filters
- [ ] Copy button has green pulse animation
- [ ] Mobile title has glitch animation on load
- [ ] Mobile header has red accent underline
- [ ] All existing functionality (URL sync, keyboard shortcuts, toast) still works

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration fixes for UI polish"
```
