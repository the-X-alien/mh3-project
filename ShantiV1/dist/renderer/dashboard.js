"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function renderTabs(tabs) {
    const list = document.getElementById("tab-list");
    if (!list)
        return;
    if (tabs.length === 0) {
        list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
        return;
    }
    list.innerHTML = tabs
        .map((t) => `
      <div class="tab-entry">
        <span class="browser-badge ${t.browser}">${t.browser}</span>
        <span class="tab-title" title="${escapeHtml(t.tabTitle)}">${escapeHtml(t.tabTitle)}</span>
        <span class="tab-time">${formatTime(t.timestamp)}</span>
      </div>`)
        .join("");
}
function setPermissionBanner(ok) {
    const banner = document.getElementById("permission-banner");
    if (!banner)
        return;
    if (ok) {
        banner.classList.add("hidden");
    }
    else {
        banner.classList.remove("hidden");
    }
}
async function init() {
    const api = window.tabDashboard;
    // Load initial state
    const [tabs, permission] = await Promise.all([api.getTabs(), api.getPermission()]);
    renderTabs(tabs);
    setPermissionBanner(permission);
    // Live updates from main process
    api.onTabsInit((t) => renderTabs(t));
    api.onTabsUpdate((t) => renderTabs(t));
    api.onPermissionStatus((ok) => setPermissionBanner(ok));
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
//# sourceMappingURL=dashboard.js.map