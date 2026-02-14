const BATCH_SIZE = 10;

let activeCategory = "all";
let searchQuery = "";
let visibleCount = BATCH_SIZE;

const searchInput = document.getElementById("search-input") as HTMLInputElement;
const releaseList = document.getElementById("release-list")!;
const loadMoreBtn = document.getElementById("load-more-btn")!;
const loadMoreContainer = document.getElementById("load-more-container")!;
const loadMoreCount = document.getElementById("load-more-count")!;
const navItems = document.querySelectorAll<HTMLButtonElement>(".nav-item");
const mobileNavPills = document.querySelectorAll<HTMLButtonElement>(".pill");
const releaseWrappers = Array.from(releaseList.querySelectorAll<HTMLElement>(".release-wrapper"));

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
        const cats: string[] = JSON.parse(card.dataset.categories || "[]");
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
      const cats: string[] = JSON.parse(card.dataset.categories || "[]");
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
    const remaining = matching.length - visibleCount;
    if (remaining > 0) {
      loadMoreContainer.style.display = "";
      loadMoreCount.textContent = `\u00B7 ${remaining} remaining`;
    } else {
      loadMoreContainer.style.display = "none";
    }
  }, 150); // matches fade-out duration

  // Update URL (immediate, don't wait for animation)
  const params = new URLSearchParams();
  if (activeCategory !== "all") params.set("category", activeCategory);
  if (searchQuery) params.set("q", searchQuery);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, "", url);
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

initFromURL();
