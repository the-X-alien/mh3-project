export {};

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

let currentTabs: TabSnapshot[] = [];
let liveTimer: ReturnType<typeof setInterval> | null = null;

const RAINBOW = ["#FF5252", "#FFB74D", "#FFD54F", "#69F0AE", "#40C4FF", "#7C4DFF", "#E040FB"];

let otherSitesList: SiteTime[] = [];

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

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m`;
}

function parseTabTitle(title: string): { site: string; page: string } {
  const parts = title.split(" - ");
  if (parts.length >= 2) {
    return { site: parts[parts.length - 1].trim(), page: parts.slice(0, -1).join(" - ").trim() };
  }
  return { site: title, page: "" };
}

function computeDuration(tabs: TabSnapshot[], index: number): string {
  if (index === 0) {
    return `${formatDuration(Date.now() - tabs[0].timestamp)} (active)`;
  }
  const ms = tabs[index - 1].timestamp - tabs[index].timestamp;
  if (ms < 1000) return "just a moment";
  return formatDuration(ms);
}

function getSiteDurationMs(tabs: TabSnapshot[], index: number): number {
  if (index === 0) return Date.now() - tabs[0].timestamp;
  return tabs[index - 1].timestamp - tabs[index].timestamp;
}

interface SiteTime {
  site: string;
  totalMs: number;
  color: string;
}

function computeSiteDurations(tabs: TabSnapshot[]): SiteTime[] {
  if (tabs.length === 0) { otherSitesList = []; return []; }

  const msBySite = new Map<string, number>();

  for (let i = 0; i < tabs.length; i++) {
    const { site } = parseTabTitle(tabs[i].tabTitle);
    const key = site || "(unknown)";
    msBySite.set(key, (msBySite.get(key) || 0) + getSiteDurationMs(tabs, i));
  }

  const sorted = Array.from(msBySite.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, ms]) => ms > 0);

  otherSitesList = [];
  otherExpanded = false;

  if (sorted.length <= 7) {
    return sorted.map(([siteName, totalMs], i) => ({
      site: siteName, totalMs, color: RAINBOW[i % RAINBOW.length],
    }));
  }

  const top7 = sorted.slice(0, 7).map(([siteName, totalMs], i) => ({
    site: siteName, totalMs, color: RAINBOW[i],
  }));

  const otherMs = sorted.slice(7).reduce((sum, [, ms]) => sum + ms, 0);
  otherSitesList = sorted.slice(7).map(([siteName, totalMs]) => ({
    site: siteName, totalMs, color: "#555",
  }));

  return [...top7, { site: "Other", totalMs: otherMs, color: "#555" }];
}

let otherExpanded = false;

function renderDonutChart(sites: SiteTime[]): void {
  const container = document.getElementById("chart-container");
  const section = document.getElementById("chart-section");
  if (!container || !section) return;

  if (sites.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  const total = sites.reduce((s, st) => s + st.totalMs, 0);
  if (total <= 0) { section.classList.add("hidden"); return; }

  const cx = 100, cy = 100, r = 72, sw = 20;
  const circumference = 2 * Math.PI * r;

  let svg = `<svg viewBox="0 0 200 200" class="donut">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${sw}" />`;

  let offset = 0;
  for (const st of sites) {
    const dash = (st.totalMs / total) * circumference;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${st.color}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})" class="donut-segment" />`;
    offset += dash;
  }

  svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="var(--text)" font-size="22" font-weight="600">${formatDuration(total)}</text>`;
  svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--muted)" font-size="11">total</text>`;
  svg += `</svg>`;

  let legend = `<div class="chart-legend">`;
  for (const st of sites) {
    const pct = Math.round((st.totalMs / total) * 100);
    const isOther = st.site === "Other";
    legend += `<div class="legend-item ${isOther ? "legend-other" : ""}" data-other="${isOther ? "true" : ""}">
      <span class="legend-dot" style="background:${st.color}"></span>
      <span class="legend-label">${escapeHtml(st.site)}</span>
      <span class="legend-value">${formatDuration(st.totalMs)}</span>
      <span class="legend-pct">${pct}%</span>
      ${isOther && otherSitesList.length > 0 ? '<span class="legend-expand">▸</span>' : ""}
    </div>`;
    if (isOther && otherExpanded) {
      for (const sub of otherSitesList) {
        const subPct = Math.round((sub.totalMs / total) * 100);
        legend += `<div class="legend-item legend-sub">
          <span class="legend-dot" style="background:${sub.color};opacity:0.4"></span>
          <span class="legend-label">${escapeHtml(sub.site)}</span>
          <span class="legend-value">${formatDuration(sub.totalMs)}</span>
          <span class="legend-pct">${subPct}%</span>
        </div>`;
      }
    }
  }
  legend += `</div>`;
  container.innerHTML = svg + legend;

  // Click handler for "Other"
  const otherRow = container.querySelector(".legend-other");
  if (otherRow) {
    otherRow.addEventListener("click", () => {
      otherExpanded = !otherExpanded;
      renderDonutChart(sites);
    });
  }
}

function renderTabs(tabs: TabSnapshot[]): void {
  currentTabs = tabs;
  const list = document.getElementById("tab-list");
  const section = document.getElementById("tabs-section");
  const count = document.getElementById("toggle-count");
  if (!list || !section || !count) return;

  if (tabs.length === 0) {
    section.classList.add("hidden");
    list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    renderDonutChart(computeSiteDurations(tabs));
    return;
  }

  section.classList.remove("hidden");
  count.textContent = String(tabs.length);

  list.innerHTML = tabs
    .map((t, i) => {
      const { site, page } = parseTabTitle(t.tabTitle);
      const displayTitle = page ? `${escapeHtml(site)} - ${escapeHtml(page)}` : escapeHtml(site);
      return `
      <div class="tab-entry">
        <span class="browser-badge ${t.browser}">${t.browser}</span>
        <div class="tab-info">
          <span class="tab-title" title="${escapeHtml(t.tabTitle)}">${displayTitle}</span>
          <span class="tab-duration">${computeDuration(tabs, i)}</span>
        </div>
        <span class="tab-time">${formatTime(t.timestamp)}</span>
      </div>`;
    })
    .join("");

  renderDonutChart(computeSiteDurations(tabs));

  if (!liveTimer) {
    liveTimer = setInterval(() => {
      if (currentTabs.length > 0) {
        const durEls = document.querySelectorAll(".tab-duration");
        durEls.forEach((el, i) => {
          if (i < currentTabs.length) el.textContent = computeDuration(currentTabs, i);
        });
        renderDonutChart(computeSiteDurations(currentTabs));
      }
    }, 1000);
  }
}

function setupToggle(): void {
  const toggle = document.getElementById("toggle-tabs");
  const collapse = document.getElementById("tabs-collapse");
  const icon = document.getElementById("toggle-icon");
  if (!toggle || !collapse || !icon) return;

  toggle.addEventListener("click", () => {
    const isOpen = collapse.classList.toggle("open");
    icon.classList.toggle("open", isOpen);
  });
}

function setPermissionBanner(ok: boolean): void {
  const banner = document.getElementById("permission-banner");
  if (!banner) return;
  banner.classList.toggle("hidden", ok);
}

async function init(): Promise<void> {
  const api = window.tabDashboard;

  const [tabs, permission] = await Promise.all([api.getTabs(), api.getPermission()]);
  renderTabs(tabs);
  setPermissionBanner(permission);

  api.onTabsInit((t: TabSnapshot[]) => renderTabs(t));
  api.onTabsUpdate((t: TabSnapshot[]) => renderTabs(t));
  api.onPermissionStatus((ok: boolean) => setPermissionBanner(ok));

  setupToggle();

  document.getElementById("clear-btn")?.addEventListener("click", () => {
    api.clearTabs();
    renderTabs([]);
  });

  document.getElementById("open-prefs-btn")?.addEventListener("click", () => {
    api.openAccessibilityPrefs();
  });
}

init();
