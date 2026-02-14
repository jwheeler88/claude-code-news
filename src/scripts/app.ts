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

    // Search filter — match on version or individual change items only
    if (searchQuery) {
      const version = card.dataset.version?.toLowerCase() || "";
      const items = wrapper.querySelectorAll<HTMLElement>(".change-item");
      const anyItemMatch = Array.from(items).some((item) =>
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

initFromURL();
