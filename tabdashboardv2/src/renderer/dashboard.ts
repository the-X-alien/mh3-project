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

interface Contact {
  id: string; name: string; role: string; email: string; phone: string;
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
  setSurveyAdjustment: (adj: number) => Promise<void>;
  getSurveyAdjustment: () => Promise<number | null>;
  openRageRoom: () => void;
  getAlarmState: () => Promise<boolean>;
  clearAlarm: () => void;
  onAlarmState: (cb: (active: boolean) => void) => void;
  breathComplete: () => void;
  getContacts: () => Promise<Contact[]>;
  addContact: (c: Omit<Contact, "id">) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  contactPerson: (id: string, method: "email" | "sms") => void;
  sendMessage: (id: string, message: string) => void;
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
  const hrsEl = document.getElementById("factor-hours");
  const swEl = document.getElementById("factor-switches");
  const sitesEl = document.getElementById("factor-sites");
  if (valEl) { valEl.textContent = String(data.score); valEl.style.color = data.score < 35 ? "#69F0AE" : data.score < 65 ? "#FFD54F" : "#FF5252"; }
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
  barFill.style.background = data.cli > 60 ? "#FF5252" : data.cli > 40 ? "#FFD54F" : "#69F0AE";

  if (data.faultTriggered) {
    status.textContent = "\u26A0 Social Deprivation Detected";
    status.style.color = "#FF5252";
    fault.classList.remove("hidden");
  } else {
    status.textContent = data.cli > 60 ? "\u26A0 Low Social Connection" : "\u2713 Socially Connected";
    status.style.color = data.cli > 60 ? "#FFD54F" : "#69F0AE";
    fault.classList.add("hidden");
  }
}

// ── Survey ──

const SURVEY_QUESTIONS = [
  { id: "stress-level", text: "How would you rate your current stress level?", em: "(1 = relaxed, 5 = overwhelmed)", options: ["1", "2", "3", "4", "5"] },
  { id: "anxiety", text: "Have you felt anxious today?", options: ["Not at all", "A little", "Moderately", "Very"] },
  { id: "social", text: "Have you had meaningful social interaction today?", options: ["Yes", "No"] },
  { id: "energy", text: "How is your energy level?", options: ["Low", "Medium", "High"] },
  { id: "overwhelm", text: "Are you feeling overwhelmed by your workload?", options: ["Not at all", "A little", "Somewhat", "Very"] },
  { id: "break", text: "Have you taken a break in the last 2 hours?", options: ["Yes", "No"] },
  { id: "sleep", text: "How was your sleep quality last night?", options: ["Poor", "Fair", "Good"] },
];

let surveyAnswers: Record<string, string> = {};

function cancelSurvey(): void {
  document.getElementById("survey-overlay")?.classList.add("hidden");
}

function openSurvey(): void {
  const overlay = document.getElementById("survey-overlay");
  const container = document.getElementById("survey-questions");
  if (!overlay || !container) return;

  surveyAnswers = {};

  container.innerHTML = SURVEY_QUESTIONS.map(q => `
    <div class="survey-question">
      <div class="survey-q-text">${q.text} <span class="survey-em">${q.em || ""}</span></div>
      <div class="survey-q-options" data-q="${q.id}">
        ${q.options.map(o => `<span class="survey-opt" data-value="${o}">${o}</span>`).join("")}
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".survey-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.parentElement;
      if (!parent) return;
      parent.querySelectorAll(".survey-opt").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      surveyAnswers[parent.dataset.q || ""] = (btn as HTMLElement).dataset.value || "";
    });
  });

  overlay.classList.remove("hidden");
}

function submitSurvey(): void {
  const api = window.tabDashboard;
  const answered = Object.keys(surveyAnswers).length;
  if (answered < SURVEY_QUESTIONS.length) return;

  // Each answer maps to a stress adjustment delta (-X to +X)
  const stressDelta = (Number(surveyAnswers["stress-level"]) || 3) - 3;  // -2 to +2 -> scale to -10 to +10
  const anxietyDelta: Record<string, number> = { "Not at all": -8, "A little": 0, "Moderately": 8, "Very": 16 };
  const socialDelta: Record<string, number> = { "Yes": -12, "No": 8 };
  const energyDelta: Record<string, number> = { "Low": 8, "Medium": 0, "High": -8 };
  const overwhelmDelta: Record<string, number> = { "Not at all": -8, "A little": 0, "Somewhat": 8, "Very": 16 };
  const breakDelta: Record<string, number> = { "Yes": -8, "No": 8 };
  const sleepDelta: Record<string, number> = { "Poor": 12, "Fair": 0, "Good": -8 };

  const deltas = [
    stressDelta * 5,
    anxietyDelta[surveyAnswers["anxiety"]] || 0,
    socialDelta[surveyAnswers["social"]] || 0,
    energyDelta[surveyAnswers["energy"]] || 0,
    overwhelmDelta[surveyAnswers["overwhelm"]] || 0,
    breakDelta[surveyAnswers["break"]] || 0,
    sleepDelta[surveyAnswers["sleep"]] || 0,
  ];

  const adjustment = deltas.reduce((a, b) => a + b, 0);
  void api.setSurveyAdjustment(adjustment);

  document.getElementById("survey-overlay")?.classList.add("hidden");
  showNotification("Survey submitted. Stress score adjusted.");
}

// ── Breathing (auto-triggered only) ──

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

  // Phase 1: 3-second warning
  textEl.textContent = "Your Stress Levels are too high, please take a deep breath";
  timerEl.textContent = "3";

  let warningCount = 3;
  warningTimeout = setInterval(() => {
    warningCount--;
    if (warningCount > 0) {
      timerEl.textContent = String(warningCount);
    }
  }, 1000) as unknown as ReturnType<typeof setTimeout>;

  // Phase 2: after 3 seconds, start the 25-second breathing cycle
  setTimeout(() => {
    if (warningTimeout) { clearInterval(warningTimeout as unknown as number); warningTimeout = null; }

    let remaining = 25;

    const tick = (): void => {
      const phase = 25 - remaining;
      const cycle = phase % 5;
      const inOut = cycle < 2.5;
      const progress = inOut ? cycle / 2.5 : 1 - (cycle - 2.5) / 2.5;
      circle.style.transform = `scale(${0.4 + progress * 0.6})`;
      textEl.textContent = inOut ? "Breathe in\u2026" : "Breathe out\u2026";
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
      collapse.classList.toggle("open");
      icon.classList.toggle("open");
    });
  }
}

function setPermissionBanner(ok: boolean): void {
  const banner = document.getElementById("permission-banner");
  if (banner) banner.classList.toggle("hidden", ok);
}

// ── Trusted Contacts ──

let selectedContactId: string | null = null;

function renderContactsDropdown(contacts: Contact[]): void {
  const section = document.getElementById("contacts-section");
  const select = document.getElementById("contact-select") as HTMLSelectElement | null;
  if (!section || !select) return;

  if (contacts.length === 0) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const prev = selectedContactId;
  select.innerHTML = `<option value="">-- Select Contact --</option>`;
  for (const c of contacts) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.role}`;
    if (c.id === prev) opt.selected = true;
    select.appendChild(opt);
  }
  if (!prev || !contacts.some(c => c.id === prev)) {
    selectedContactId = null;
    select.value = "";
  }

  hideMessageArea();
}

function hideMessageArea(): void {
  const area = document.getElementById("contact-message-area");
  const noMethod = document.getElementById("contact-no-method");
  const inputArea = document.getElementById("contact-message-input-area");
  if (area) area.classList.add("hidden");
  if (noMethod) noMethod.classList.add("hidden");
  if (inputArea) inputArea.classList.add("hidden");
}

function onContactAction(): void {
  const select = document.getElementById("contact-select") as HTMLSelectElement | null;
  if (!select || !select.value) return;

  const id = select.value;
  selectedContactId = id;
  const area = document.getElementById("contact-message-area");
  const noMethod = document.getElementById("contact-no-method");
  const inputArea = document.getElementById("contact-message-input-area");
  if (!area || !noMethod || !inputArea) return;

  area.classList.remove("hidden");

  // Fetch contacts to check method availability
  window.tabDashboard.getContacts().then(contacts => {
    const c = contacts.find(ct => ct.id === id);
    if (!c) return;
    if (!c.email && !c.phone) {
      noMethod.classList.remove("hidden");
      inputArea.classList.add("hidden");
    } else {
      noMethod.classList.add("hidden");
      inputArea.classList.remove("hidden");
    }
  });
}

function onContactSend(): void {
  const select = document.getElementById("contact-select") as HTMLSelectElement | null;
  const input = document.getElementById("contact-message-input") as HTMLTextAreaElement | null;
  if (!select || !input || !select.value) return;
  const message = input.value.trim();
  if (!message) return;
  window.tabDashboard.sendMessage(select.value, message);
  input.value = "";
  hideMessageArea();
}

async function refreshContacts(): Promise<void> {
  const c = await window.tabDashboard.getContacts();
  renderContactsDropdown(c);
}

function openContactConfig(): void {
  const overlay = document.getElementById("contact-config-overlay");
  if (overlay) overlay.classList.remove("hidden");
}

function closeContactConfig(): void {
  const overlay = document.getElementById("contact-config-overlay");
  if (overlay) overlay.classList.add("hidden");
}

async function addContactSubmit(): Promise<void> {
  const name = (document.getElementById("contact-name-input") as HTMLInputElement).value.trim();
  const role = (document.getElementById("contact-role-input") as HTMLInputElement).value.trim();
  const email = (document.getElementById("contact-email-input") as HTMLInputElement).value.trim();
  const phone = (document.getElementById("contact-phone-input") as HTMLInputElement).value.trim();
  if (!name) return;
  await window.tabDashboard.addContact({ name, role, email, phone });
  (document.getElementById("contact-name-input") as HTMLInputElement).value = "";
  (document.getElementById("contact-role-input") as HTMLInputElement).value = "";
  (document.getElementById("contact-email-input") as HTMLInputElement).value = "";
  (document.getElementById("contact-phone-input") as HTMLInputElement).value = "";
  closeContactConfig();
  await refreshContacts();
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

  // Loneliness
  const lonelinessData = await api.getLoneliness();
  renderLoneliness(lonelinessData);
  api.onSocialUpdate((data: LonelinessData) => renderLoneliness(data));

  // Fault codes (with cooldown)
  let lastFaultNotif = 0;
  api.onFaultTriggered((fault: FaultData) => {
    const faultEl = document.getElementById("active-fault");
    if (!faultEl) return;
    faultEl.textContent = `\u26A0 ${fault.code}: ${fault.message}`;
    faultEl.classList.remove("hidden");
    const now = Date.now();
    if (now - lastFaultNotif > 120000) {
      lastFaultNotif = now;
      showNotification(fault.message);
    }
  });

  // Auto-breath listener
  setupAutoBreath();

  // Sleep slider
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

  // Alarm state
  const alarmActive = await api.getAlarmState();
  const body = document.getElementById("app-body");
  if (alarmActive && body) body.classList.add("alarm");

  setupToggle();

  document.getElementById("open-prefs-btn")?.addEventListener("click", () => {
    api.openAccessibilityPrefs();
  });

  // Survey
  document.getElementById("survey-btn")?.addEventListener("click", openSurvey);
  document.getElementById("survey-submit")?.addEventListener("click", submitSurvey);
  document.getElementById("survey-cancel")?.addEventListener("click", cancelSurvey);

  // Rage Room
  document.getElementById("rage-btn")?.addEventListener("click", () => api.openRageRoom());

  // Open web dashboard
  document.getElementById("open-dashboard-btn")?.addEventListener("click", () => api.openWebDashboard());

  // Trusted Contacts
  void refreshContacts();
  document.getElementById("contact-action-btn")?.addEventListener("click", onContactAction);
  document.getElementById("contact-send-btn")?.addEventListener("click", onContactSend);
  document.getElementById("contacts-configure-btn")?.addEventListener("click", openContactConfig);
  document.getElementById("contact-config-cancel")?.addEventListener("click", closeContactConfig);
  document.getElementById("contact-config-add")?.addEventListener("click", addContactSubmit);
}

init();
