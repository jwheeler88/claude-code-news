const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

const toast = document.getElementById("toast")!;
const dismissBtn = document.getElementById("toast-dismiss")!;

const loadedTimestamp = (window as any).__BUILD_TIMESTAMP__ as number;

async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.buildTimestamp > loadedTimestamp) {
      toast.hidden = false;
    }
  } catch {
    // Silently ignore - not critical
  }
}

dismissBtn.addEventListener("click", () => {
  toast.hidden = true;
});

setInterval(checkForUpdates, POLL_INTERVAL);
