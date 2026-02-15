const BATCH_SIZE = 10;

let activeCategory = "all";
let searchQuery = "";
let visibleCount = BATCH_SIZE;
let renderTimeoutId: ReturnType<typeof setTimeout> | null = null;

const searchInput = document.getElementById("search-input") as HTMLInputElement;
const releaseList = document.getElementById("release-list")!;
const loadMoreBtn = document.getElementById("load-more-btn")!;
const loadMoreContainer = document.getElementById("load-more-container")!;
const loadMoreCount = document.getElementById("load-more-count")!;
const navItems = document.querySelectorAll<HTMLButtonElement>(".nav-item");
const mobileNavPills = document.querySelectorAll<HTMLButtonElement>(".pill");
const releaseWrappers = Array.from(releaseList.querySelectorAll<HTMLElement>(".release-wrapper"));
const statPrimaryValue = document.getElementById("stat-primary-value");
const statPrimaryLabel = document.getElementById("stat-primary-label");
const statSecondaryValue = document.getElementById("stat-secondary-value");
const statSecondaryLabel = document.getElementById("stat-secondary-label");

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

    const parent = node.parentNode;
    if (!parent) continue;
    parent.replaceChild(frag, node);
  }
}

function clearHighlight(el: HTMLElement): void {
  el.querySelectorAll("mark.search-highlight").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

function parseCategories(raw: string | undefined): string[] {
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function getMatchingWrappers(): HTMLElement[] {
  return releaseWrappers.filter((wrapper) => {
    const card = wrapper.querySelector(".release-card") as HTMLElement;
    if (!card) return false;

    const items = Array.from(wrapper.querySelectorAll<HTMLElement>(".change-item"));

    // When both filters are active, require at least one item matching both
    // OR version matching the search with the card having category items
    if (activeCategory !== "all" && searchQuery) {
      const version = card.dataset.version?.toLowerCase() || "";
      if (version.includes(searchQuery)) {
        const cats = parseCategories(card.dataset.categories);
        return cats.includes(activeCategory);
      }
      return items.some((item) => {
        const categoryMatch = item.dataset.category === activeCategory;
        const searchMatch = item.textContent?.toLowerCase().includes(searchQuery);
        return categoryMatch && searchMatch;
      });
    }

    // Category filter only
    if (activeCategory !== "all") {
      const cats = parseCategories(card.dataset.categories);
      if (!cats.includes(activeCategory)) return false;
    }

    // Search filter only — match on version or individual change items
    if (searchQuery) {
      const version = card.dataset.version?.toLowerCase() || "";
      const anyItemMatch = items.some((item) =>
        item.textContent?.toLowerCase().includes(searchQuery)
      );
      if (!version.includes(searchQuery) && !anyItemMatch) return false;
    }

    return true;
  });
}

function countVisibleItems(wrappers: HTMLElement[]): number {
  return wrappers.reduce((sum, w) => {
    return sum + Array.from(w.querySelectorAll<HTMLElement>(".change-item")).filter(
      (item) => item.style.display !== "none"
    ).length;
  }, 0);
}

function filterItems(wrapper: HTMLElement): void {
  const items = wrapper.querySelectorAll<HTMLElement>(".change-item");
  const visibleCategories = new Set<string>();

  // Apply both category and search filters
  items.forEach((item) => {
    const categoryMatch = activeCategory === "all" || item.dataset.category === activeCategory;
    const searchMatch = !searchQuery || item.textContent?.toLowerCase().includes(searchQuery);
    item.style.display = categoryMatch && searchMatch ? "" : "none";
  });

  // If search matched the card but no individual items survived, show all category-matching items
  // (e.g. searching by version number like "2.1.30")
  const anyVisible = Array.from(items).some((item) => item.style.display !== "none");
  if (!anyVisible && searchQuery) {
    items.forEach((item) => {
      const categoryMatch = activeCategory === "all" || item.dataset.category === activeCategory;
      item.style.display = categoryMatch ? "" : "none";
    });
  }

  items.forEach((item) => {
    if (item.style.display !== "none" && item.dataset.category) {
      visibleCategories.add(item.dataset.category);
    }
  });

  wrapper.querySelectorAll<HTMLElement>(".tag").forEach((tag) => {
    const tagCategory = tag.className.match(/tag-(\S+)/)?.[1] || "";
    tag.style.display = visibleCategories.has(tagCategory) ? "" : "none";
  });

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
}

function render(): void {
  const matching = getMatchingWrappers();

  // Cancel any in-flight render and clean up stale animation state
  if (renderTimeoutId !== null) {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = null;
    // Remove leftover fade classes from the cancelled render
    releaseWrappers.forEach((w) => {
      w.classList.remove("fade-out", "fade-in");
    });
  }

  // Capture currently visible set before any changes
  const previouslyVisible = new Set(
    releaseWrappers.filter((w) => w.style.display !== "none")
  );

  // Phase 1: fade out wrappers that should hide
  const visibleSet = new Set(matching.slice(0, visibleCount));
  releaseWrappers.forEach((w) => {
    if (!visibleSet.has(w) && w.style.display !== "none") {
      w.classList.add("fade-out");
    }
  });

  // Phase 2: after fade-out completes, hide them and show new ones
  renderTimeoutId = setTimeout(() => {
    renderTimeoutId = null;

    const nextVisible = new Set(matching.slice(0, visibleCount));

    // Hide wrappers that are no longer matching (skip ones staying visible)
    releaseWrappers.forEach((w) => {
      w.classList.remove("fade-out");
      if (!nextVisible.has(w)) {
        w.style.display = "none";
      }
    });

    // Show matching wrappers, fade in newly appearing ones
    let newIndex = 0;
    matching.forEach((w, i) => {
      if (i < visibleCount) {
        w.style.display = "";
        filterItems(w);
        if (!previouslyVisible.has(w)) {
          // Clear entrance observer classes so fade-in isn't overridden by .entered
          w.classList.remove("entered", "observe-entrance");
          w.classList.add("fade-in");
          // Remove fade-in class after staggered delay to trigger CSS transition
          setTimeout(() => w.classList.remove("fade-in"), 30 * (++newIndex));
        }
      }
    });

    const remaining = matching.length - visibleCount;
    if (remaining > 0) {
      loadMoreContainer.style.display = "";
      loadMoreCount.textContent = `\u00B7 ${remaining} remaining`;
    } else {
      loadMoreContainer.style.display = "none";
    }

    updateStats(matching);
    requestAnimationFrame(() => observeNewCards());
  }, 300); // matches .release-wrapper CSS transition duration

  // Update URL (immediate, don't wait for animation)
  const params = new URLSearchParams();
  if (activeCategory !== "all") params.set("category", activeCategory);
  if (searchQuery) params.set("q", searchQuery);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, "", url);
}

function updateStats(matching: HTMLElement[]): void {
  if (!statPrimaryValue || !statPrimaryLabel || !statSecondaryValue || !statSecondaryLabel) return;

  const matchCount = matching.length;

  if (searchQuery) {
    const totalItems = countVisibleItems(matching);
    statPrimaryValue.textContent = String(totalItems);
    statPrimaryLabel.textContent = `Results for "${searchQuery}"`;
    statSecondaryValue.textContent = String(matchCount);
    statSecondaryLabel.textContent = "Releases Matched";
  } else if (activeCategory !== "all") {
    const totalItems = countVisibleItems(matching);
    const label = document.querySelector(`.nav-item.active .nav-label`)?.textContent || activeCategory;
    statPrimaryValue.textContent = String(totalItems);
    statPrimaryLabel.textContent = `${label} Items`;
    statSecondaryValue.textContent = String(matchCount);
    statSecondaryLabel.textContent = "Releases";
  } else {
    statPrimaryValue.textContent = statPrimaryValue.dataset.original || "";
    statPrimaryLabel.textContent = "This Month";
    statSecondaryValue.textContent = statSecondaryValue.dataset.original || "";
    statSecondaryLabel.textContent = "Total Releases";
  }
}

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

// Cmd/Ctrl+K to focus search
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    searchInput.focus();
  }
});

// ESC to clear search
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    searchQuery = "";
    visibleCount = BATCH_SIZE;
    render();
  }
});

// Load more
loadMoreBtn.addEventListener("click", () => {
  const previousCount = visibleCount;
  visibleCount += BATCH_SIZE;
  const matching = getMatchingWrappers();
  render();

  // Scroll to the first newly revealed card (after render completes)
  const firstNew = matching[previousCount];
  if (firstNew) {
    setTimeout(() => {
      firstNew.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }
});

// Copy to clipboard with feedback animation
releaseList.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement;
  if (!btn) return;

  const text = btn.dataset.copy || "";
  if (!navigator.clipboard) return;

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
  }).catch(() => {
    // Clipboard write can fail (permissions, insecure context, loss of focus)
  });
});

// Init from URL params
function initFromURL(): void {
  // Store original stats values for reset
  if (statPrimaryValue) statPrimaryValue.dataset.original = statPrimaryValue.textContent || "";
  if (statSecondaryValue) statSecondaryValue.dataset.original = statSecondaryValue.textContent || "";

  const params = new URLSearchParams(window.location.search);
  const cat = params.get("category");
  const q = params.get("q");

  if (cat) {
    activeCategory = cat;
    navItems.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === cat);
    });
    mobileNavPills.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === cat);
    });
  }

  if (q) {
    searchQuery = q.toLowerCase();
    searchInput.value = q;
  }

  render();
}

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
    searchInput.value = "";
    searchQuery = "";
    visibleCount = BATCH_SIZE;
    render();
  });

  // ESC also closes mobile search
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contentHeader.classList.contains("search-expanded")) {
      contentHeader.classList.remove("search-expanded");
    }
  });
}

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

initFromURL();
