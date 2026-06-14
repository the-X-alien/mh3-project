export {};

interface TabSnapshot {
  timestamp: number;
  browser: "chrome" | "firefox" | "safari" | "edge" | "other";
  tabTitle: string;
}

interface StressPoint {
  score: number;
  timestamp: number;
  factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number };
}

interface LonelinessData {
  socialMs: number; solitaryMs: number; cli: number; faultTriggered: boolean;
}

interface FaultData {
  code: string; message: string;
}

interface TabDashboardAPI {
  getTabs: () => Promise<TabSnapshot[]>;
  getPermission: () => Promise<boolean>;
  openAccessibilityPrefs: () => void;
  onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void) => void;
  onTabsInit: (cb: (tabs: TabSnapshot[]) => void) => void;
  onPermissionStatus: (cb: (ok: boolean) => void) => void;
  getStress: () => Promise<StressPoint>;
  getStressHistory: () => Promise<StressPoint[]>;
  getSleepHours: () => Promise<number>;
  setSleepHours: (h: number) => Promise<void>;
  onStressUpdate: (cb: (data: StressPoint, history: StressPoint[]) => void) => void;
  getLoneliness: () => Promise<LonelinessData>;
  onSocialUpdate: (cb: (data: LonelinessData) => void) => void;
  onFaultTriggered: (cb: (fault: FaultData) => void) => void;
  onAutoBreath: (cb: () => void) => void;
  openRageRoom: () => void;
  getAlarmState: () => Promise<boolean>;
  clearAlarm: () => void;
  onAlarmState: (cb: (active: boolean) => void) => void;
  breathComplete: () => void;
  setSurveyAdjustment: (adj: number) => Promise<void>;
  openWebDashboard: () => void;
}

declare global {
  interface Window {
    tabDashboard: TabDashboardAPI;
  }
}

let currentTabs: TabSnapshot[] = [];
let liveTimer: ReturnType<typeof setInterval> | null = null;

const RAINBOW = ["#FF5252", "#FFB74D", "#FFD54F", "#69F0AE", "#40C4FF", "#7C4DFF", "#E040FB"];

function showNotification(body: string): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Shanti", { body });
  }
}

let otherSitesList: { site: string; totalMs: number; color: string }[] = [];
let otherExpanded = false;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function parseTabTitle(title: string): { site: string; page: string } {
  const parts = title.split(" - ");
  if (parts.length >= 2) {
    return { site: parts[parts.length - 1].trim(), page: parts.slice(0, -1).join(" - ").trim() };
  }
  return { site: title, page: "" };
}

function computeDuration(tabs: TabSnapshot[], index: number): string {
  if (index === 0) return `${formatDuration(Date.now() - tabs[0].timestamp)} (active)`;
  const ms = tabs[index - 1].timestamp - tabs[index].timestamp;
  return ms < 1000 ? "just a moment" : formatDuration(ms);
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
  if (tabs.length === 0) { otherSitesList = []; otherExpanded = false; return []; }
  const msBySite = new Map<string, number>();
  for (let i = 0; i < tabs.length; i++) {
    const { site } = parseTabTitle(tabs[i].tabTitle);
    msBySite.set(site, (msBySite.get(site) || 0) + getSiteDurationMs(tabs, i));
  }
  const sorted = Array.from(msBySite.entries()).sort((a, b) => b[1] - a[1]).filter(([, ms]) => ms > 0);
  otherSitesList = [];
  otherExpanded = false;
  if (sorted.length <= 7) {
    return sorted.map(([siteName, totalMs], i) => ({ site: siteName, totalMs, color: RAINBOW[i % RAINBOW.length] }));
  }
  const top7 = sorted.slice(0, 7).map(([siteName, totalMs], i) => ({ site: siteName, totalMs, color: RAINBOW[i] }));
  const otherMs = sorted.slice(7).reduce((sum, [, ms]) => sum + ms, 0);
  otherSitesList = sorted.slice(7).map(([siteName, totalMs]) => ({ site: siteName, totalMs, color: "#555" }));
  return [...top7, { site: "Other", totalMs: otherMs, color: "#555" }];
}

function renderDonutChart(sites: SiteTime[]): void {
  const container = document.getElementById("chart-container");
  const section = document.getElementById("chart-section");
  if (!container || !section) return;
  if (sites.length === 0) { section.classList.add("hidden"); return; }
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
  svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--muted)" font-size="11">total</text></svg>`;

  let legend = `<div class="chart-legend">`;
  for (const st of sites) {
    const pct = Math.round((st.totalMs / total) * 100);
    const isOther = st.site === "Other";
    legend += `<div class="legend-item ${isOther ? "legend-other" : ""}">
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
  const otherRow = container.querySelector(".legend-other");
  if (otherRow) otherRow.addEventListener("click", () => { otherExpanded = !otherExpanded; renderDonutChart(sites); });
}

// ── Stress ──

function renderStressGraph(history: StressPoint[]): void {
  const svg = document.getElementById("stress-graph") as unknown as SVGSVGElement | null;
  if (!svg) return;
  const w = 300, h = 80;
  if (history.length < 2) {
    svg.innerHTML = `<text x="150" y="40" text-anchor="middle" fill="var(--muted)" font-size="11">Collecting data…</text>`;
    return;
  }
  const points = history.map((p, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - (p.score / 100) * h;
    return `${x},${y}`;
  });
  svg.innerHTML = `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${points.join(" ")}" />
    <polygon fill="var(--accent)" fill-opacity="0.12" points="${points.join(" ")} ${w},${h} 0,${h}" />`;
}

function renderStress(data: StressPoint, history: StressPoint[]): void {
  const valEl = document.getElementById("stress-value");
  const ringEl = document.getElementById("stress-ring");
  const labelEl = document.getElementById("stress-label");
  const hrsEl = document.getElementById("factor-hours");
  const swEl = document.getElementById("factor-switches");
  const sitesEl = document.getElementById("factor-sites");

  const color = data.score < 35 ? "#2ecc71" : data.score < 65 ? "#e6a817" : "#e65032";
  const label = data.score < 35 ? "Calm" : data.score < 65 ? "Moderate" : "High Stress";

  if (valEl) { valEl.textContent = String(data.score); valEl.style.color = color; }
  if (ringEl) ringEl.style.setProperty("--ring-color", color);
  if (labelEl) { labelEl.textContent = label; labelEl.style.color = color; }
  if (hrsEl) hrsEl.textContent = `${data.factors.hoursWorked.toFixed(1)}h`;
  if (swEl) swEl.textContent = `${data.factors.switchRate.toFixed(1)}/min`;
  if (sitesEl) sitesEl.textContent = String(data.factors.uniqueSites);
  renderStressGraph(history);
}

// ── Loneliness Index ──

function renderLoneliness(data: LonelinessData): void {
  const section = document.getElementById("loneliness-section");
  const status = document.getElementById("loneliness-status");
  const detail = document.getElementById("loneliness-detail");
  const barFill = document.getElementById("loneliness-bar-fill");
  const cliEl = document.getElementById("loneliness-cli");
  const fault = document.getElementById("loneliness-fault");
  if (!section || !status || !detail || !barFill || !cliEl || !fault) return;

  if (data.socialMs + data.solitaryMs === 0) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");

  const socialStr = formatDuration(data.socialMs);
  const solitaryStr = formatDuration(data.solitaryMs);
  detail.textContent = `Social: ${socialStr}  ·  Solitary: ${solitaryStr}`;
  cliEl.textContent = `${Math.round(data.cli)}% solitary`;
  barFill.style.width = `${Math.min(data.cli, 100)}%`;
  barFill.style.background = data.cli > 60 ? "#e65032" : data.cli > 40 ? "#e6a817" : "#2ecc71";

  if (data.faultTriggered) {
    status.textContent = "⚠ Social Deprivation Detected";
    status.style.color = "#e65032";
    fault.classList.remove("hidden");
  } else {
    status.textContent = data.cli > 60 ? "⚠ Low Social Connection" : "✓ Socially Connected";
    status.style.color = data.cli > 60 ? "#e6a817" : "#2ecc71";
    fault.classList.add("hidden");
  }
}

// ── Survey ──

const SURVEY_QUESTIONS = [
  { id: "stress-level", text: "How would you rate your current stress level?", em: "(1 = relaxed, 5 = overwhelmed)", options: ["1", "2", "3", "4", "5"] },
  { id: "anxiety",      text: "Have you felt anxious today?",                  em: "",                              options: ["Not at all", "A little", "Moderately", "Very"] },
  { id: "social",       text: "Have you had meaningful social interaction today?", em: "",                          options: ["Yes", "No"] },
  { id: "energy",       text: "How is your energy level?",                     em: "",                              options: ["Low", "Medium", "High"] },
  { id: "overwhelm",    text: "Are you feeling overwhelmed by your workload?",  em: "",                              options: ["Not at all", "A little", "Somewhat", "Very"] },
  { id: "break",        text: "Have you taken a break in the last 2 hours?",   em: "",                              options: ["Yes", "No"] },
  { id: "sleep",        text: "How was your sleep quality last night?",         em: "",                              options: ["Poor", "Fair", "Good"] },
];

// Maps each answer to a 0–100 stress score contribution
const ANSWER_SCORES: Record<string, Record<string, number>> = {
  "stress-level": { "1": 10, "2": 25, "3": 50, "4": 70, "5": 90 },
  "anxiety":      { "Not at all": 0, "A little": 15, "Moderately": 40, "Very": 70 },
  "social":       { "Yes": 0, "No": 20 },
  "energy":       { "High": 0, "Medium": 15, "Low": 35 },
  "overwhelm":    { "Not at all": 0, "A little": 15, "Somewhat": 35, "Very": 60 },
  "break":        { "Yes": 0, "No": 20 },
  "sleep":        { "Good": 0, "Fair": 15, "Poor": 35 },
};
// Weights for each question (must sum to 1)
const WEIGHTS: Record<string, number> = {
  "stress-level": 0.30,
  "anxiety":      0.20,
  "social":       0.10,
  "energy":       0.10,
  "overwhelm":    0.15,
  "break":        0.05,
  "sleep":        0.10,
};

let surveyAnswers: Record<string, string> = {};

function openSurvey(): void {
  const overlay = document.getElementById("survey-overlay");
  const container = document.getElementById("survey-questions");
  if (!overlay || !container) return;
  surveyAnswers = {};
  container.innerHTML = SURVEY_QUESTIONS.map(q => `
    <div class="survey-question">
      <div class="survey-q-text">${q.text}${q.em ? ` <span class="survey-q-em">${q.em}</span>` : ""}</div>
      <div class="survey-options" data-q="${q.id}">
        ${q.options.map(o => `<button class="survey-option" data-value="${o}">${o}</button>`).join("")}
      </div>
    </div>
  `).join("");
  container.querySelectorAll(".survey-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.parentElement;
      if (!parent) return;
      parent.querySelectorAll(".survey-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      surveyAnswers[parent.dataset.q || ""] = (btn as HTMLElement).dataset.value || "";
    });
  });
  overlay.classList.remove("hidden");
}

function cancelSurvey(): void {
  document.getElementById("survey-overlay")?.classList.add("hidden");
}

function computeLocalSurveyScore(answers: Record<string, string>): number {
  let score = 0;
  for (const q of SURVEY_QUESTIONS) {
    score += (ANSWER_SCORES[q.id]?.[answers[q.id]] ?? 50) * WEIGHTS[q.id];
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

async function submitSurvey(): Promise<void> {
  const errEl = document.getElementById("survey-error") as HTMLElement | null;
  const btn = document.getElementById("survey-submit") as HTMLButtonElement | null;

  // Inline validation — show error in overlay instead of silent fail
  if (Object.keys(surveyAnswers).length < SURVEY_QUESTIONS.length) {
    if (errEl) errEl.style.display = "block";
    return;
  }
  if (errEl) errEl.style.display = "none";
  if (btn) { btn.textContent = "Sending…"; btn.disabled = true; }

  const live = await window.tabDashboard.getStress();

  // Local fallback score (always computed, used if API fails)
  const localScore = computeLocalSurveyScore(surveyAnswers);
  // Blend 60% survey / 40% live sensors
  const localBlended = Math.round(localScore * 0.6 + live.score * 0.4);

  let finalScore = localBlended;

  // Try to POST to website — get back server-computed score
  try {
    const res = await fetch("https://mh3-project.vercel.app/api/stress-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: localBlended,
        factors: live.factors,
        surveyAnswers,
        source: "desktop-checkin",
      }),
    });
    if (res.ok) {
      const data = await res.json() as { score?: number };
      if (typeof data.score === "number") finalScore = data.score;
    }
  } catch {
    // Network unavailable — localBlended already set, continue silently
  }

  // Apply to desktop stress display
  await window.tabDashboard.setSurveyAdjustment(finalScore - live.score);

  if (btn) { btn.textContent = "Submit"; btn.disabled = false; }
  document.getElementById("survey-overlay")?.classList.add("hidden");

  // Update stress ring immediately
  const updated = await window.tabDashboard.getStress();
  const hist = await window.tabDashboard.getStressHistory();
  renderStress(updated, hist);

  showNotification(`Check-in done — stress score: ${finalScore}/100`);
}

// ── Breathing ──

let breathInterval: ReturnType<typeof setInterval> | null = null;
let warningTimeout: ReturnType<typeof setTimeout> | null = null;

function startBreathing(): void {
  const overlay = document.getElementById("alarm-overlay");
  const circle = document.getElementById("breath-circle");
  const timerEl = document.getElementById("breath-timer");
  const textEl = document.getElementById("breath-text");
  if (!overlay || !circle || !timerEl || !textEl) return;

  if (breathInterval) { clearInterval(breathInterval); breathInterval = null; }
  if (warningTimeout) { clearTimeout(warningTimeout); warningTimeout = null; }

  overlay.classList.remove("hidden");
  circle.style.transform = "scale(0.4)";
  textEl.textContent = "Your stress levels are high — take a deep breath";
  timerEl.textContent = "3";

  let warningCount = 3;
  warningTimeout = setInterval(() => {
    warningCount--;
    if (warningCount > 0) timerEl.textContent = String(warningCount);
  }, 1000) as unknown as ReturnType<typeof setTimeout>;

  setTimeout(() => {
    if (warningTimeout) { clearInterval(warningTimeout as unknown as number); warningTimeout = null; }
    let remaining = 25;
    const tick = (): void => {
      const phase = 25 - remaining;
      const cycle = phase % 5;
      const inOut = cycle < 2.5;
      const progress = inOut ? cycle / 2.5 : 1 - (cycle - 2.5) / 2.5;
      circle.style.transform = `scale(${0.4 + progress * 0.6})`;
      textEl.textContent = inOut ? "Breathe in…" : "Breathe out…";
      timerEl.textContent = String(remaining);
      remaining--;
      if (remaining < 0) {
        if (breathInterval) { clearInterval(breathInterval); breathInterval = null; }
        overlay.classList.add("hidden");
        circle.style.transform = "scale(0.4)";
        window.tabDashboard.clearAlarm();
        window.tabDashboard.breathComplete();
      }
    };
    tick();
    breathInterval = setInterval(tick, 1000);
  }, 3000);
}

function setupAutoBreath(): void {
  window.tabDashboard.onAutoBreath(() => startBreathing());
  // No dismiss — user must complete the full 25-second breathing cycle.
}

// ── Tabs ──

function renderTabs(tabs: TabSnapshot[]): void {
  currentTabs = tabs;
  const list = document.getElementById("tab-list");
  const section = document.getElementById("tabs-section");
  const count = document.getElementById("toggle-count");
  const emptyMsg = document.getElementById("empty-session-msg");
  if (!list || !section || !count || !emptyMsg) return;

  if (tabs.length === 0) {
    section.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    renderDonutChart(computeSiteDurations(tabs));
    return;
  }

  emptyMsg.classList.add("hidden");
  section.classList.remove("hidden");
  count.textContent = String(tabs.length);

  list.innerHTML = tabs
    .map((t, i) => {
      const { site, page } = parseTabTitle(t.tabTitle);
      const displayTitle = page ? `${escapeHtml(site)} - ${escapeHtml(page)}` : escapeHtml(site);
      return `<div class="tab-entry">
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
        document.querySelectorAll(".tab-duration").forEach((el, i) => {
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
  if (toggle && collapse && icon) {
    toggle.addEventListener("click", () => {
      const isHidden = collapse.classList.toggle("hidden");
      icon.style.transform = isHidden ? "" : "rotate(180deg)";
    });
  }
}

function setPermissionBanner(ok: boolean): void {
  const banner = document.getElementById("permission-banner");
  if (banner) banner.classList.toggle("hidden", ok);
}

async function init(): Promise<void> {
  const api = window.tabDashboard;

  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }

  const [tabs, permission] = await Promise.all([api.getTabs(), api.getPermission()]);
  renderTabs(tabs);
  setPermissionBanner(permission);

  const [stressData, stressHistory] = await Promise.all([api.getStress(), api.getStressHistory()]);
  renderStress(stressData, stressHistory);

  api.onTabsInit((t: TabSnapshot[]) => renderTabs(t));
  api.onTabsUpdate((t: TabSnapshot[]) => renderTabs(t));
  api.onPermissionStatus((ok: boolean) => setPermissionBanner(ok));
  api.onStressUpdate((data: StressPoint, history: StressPoint[]) => renderStress(data, history));

  const lonelinessData = await api.getLoneliness();
  renderLoneliness(lonelinessData);
  api.onSocialUpdate((data: LonelinessData) => renderLoneliness(data));

  let lastFaultNotif = 0;
  api.onFaultTriggered((fault: FaultData) => {
    const faultEl = document.getElementById("active-fault");
    if (!faultEl) return;
    faultEl.textContent = `⚠ ${fault.code}: ${fault.message}`;
    faultEl.classList.remove("hidden");
    const now = Date.now();
    if (now - lastFaultNotif > 120000) {
      lastFaultNotif = now;
      showNotification(fault.message);
    }
  });

  setupAutoBreath();

  const slider = document.getElementById("sleep-slider") as HTMLInputElement | null;
  const display = document.getElementById("sleep-display");
  if (slider && display) {
    slider.value = String(await api.getSleepHours());
    display.textContent = `${slider.value}h`;
    slider.addEventListener("input", () => {
      display.textContent = `${slider.value}h`;
      void api.setSleepHours(parseFloat(slider.value));
    });
  }

  setupToggle();

  document.getElementById("open-prefs-btn")?.addEventListener("click", () => api.openAccessibilityPrefs());
  document.getElementById("survey-btn")?.addEventListener("click", openSurvey);
  document.getElementById("survey-submit")?.addEventListener("click", () => void submitSurvey());
  document.getElementById("survey-cancel")?.addEventListener("click", cancelSurvey);
  document.getElementById("survey-cancel-btn")?.addEventListener("click", cancelSurvey);
  document.getElementById("rage-btn")?.addEventListener("click", () => api.openRageRoom());
  document.getElementById("open-dashboard-btn")?.addEventListener("click", () => api.openWebDashboard());
}

init();
