export {}; // Make this file a module so global augmentation is valid

interface TabSnapshot {
  timestamp: number;
  browser: "chrome" | "firefox" | "safari" | "edge" | "other";
  tabTitle: string;
}

interface TabDashboardAPI {
  getTabs: () => Promise<TabSnapshot[]>;
  getPermission: () => Promise<boolean>;
  clearTabs: () => void;
  openAccessibilityPrefs: () => void;
  onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void) => void;
  onTabsInit: (cb: (tabs: TabSnapshot[]) => void) => void;
  onPermissionStatus: (cb: (ok: boolean) => void) => void;
}

declare global {
  interface Window {
    tabDashboard: TabDashboardAPI;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTabs(tabs: TabSnapshot[]): void {
  const list = document.getElementById("tab-list");
  if (!list) return;

  if (tabs.length === 0) {
    list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
    return;
  }

  list.innerHTML = tabs
    .map(
      (t) => `
      <div class="tab-entry">
        <span class="browser-badge ${t.browser}">${t.browser}</span>
        <span class="tab-title" title="${escapeHtml(t.tabTitle)}">${escapeHtml(t.tabTitle)}</span>
        <span class="tab-time">${formatTime(t.timestamp)}</span>
      </div>`
    )
    .join("");
}

function setPermissionBanner(ok: boolean): void {
  const banner = document.getElementById("permission-banner");
  if (!banner) return;
  if (ok) {
    banner.classList.add("hidden");
  } else {
    banner.classList.remove("hidden");
  }
}

async function init(): Promise<void> {
  const api = window.tabDashboard;

  // Load initial state
  const [tabs, permission] = await Promise.all([api.getTabs(), api.getPermission()]);
  renderTabs(tabs);
  setPermissionBanner(permission);

  // Live updates from main process
  api.onTabsInit((t: TabSnapshot[]) => renderTabs(t));
  api.onTabsUpdate((t: TabSnapshot[]) => renderTabs(t));
  api.onPermissionStatus((ok: boolean) => setPermissionBanner(ok));

  // Buttons
  document.getElementById("clear-btn")?.addEventListener("click", () => {
    api.clearTabs();
    renderTabs([]);
  });

  document.getElementById("open-prefs-btn")?.addEventListener("click", () => {
    api.openAccessibilityPrefs();
  });
}

init();
