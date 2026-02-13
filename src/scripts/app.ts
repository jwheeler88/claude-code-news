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
  wrapper.querySelectorAll<HTMLElement>(".change-item").forEach((item) => {
    const categoryMatch = activeCategory === "all" || item.dataset.category === activeCategory;
    const searchMatch = !searchQuery || item.textContent?.toLowerCase().includes(searchQuery);
    item.style.display = categoryMatch && searchMatch ? "" : "none";
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

initFromURL();
