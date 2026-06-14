export {};

interface TabSnapshot {
  timestamp: number;
  browser: "chrome" | "firefox" | "safari" | "edge" | "brave" | "opera" | "other";
  tabTitle: string;
}
interface StressPoint {
  score: number;
  timestamp: number;
  factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number };
}
interface LonelinessData { socialMs: number; solitaryMs: number; cli: number; faultTriggered: boolean }
interface FaultData { code: string; message: string }
interface Contact { id: string; name: string; role: string; email: string; phone: string }
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
}
declare global { interface Window { tabDashboard: TabDashboardAPI } }

let currentTabs: TabSnapshot[] = [];
let liveTimer: ReturnType<typeof setInterval> | null = null;
const RAINBOW = ["#FF5252","#FFB74D","#FFD54F","#69F0AE","#40C4FF","#7C4DFF","#E040FB"];

function showNotification(body: string): void {
  if ("Notification" in window && Notification.permission === "granted") new Notification("Shanti", { body });
}

let otherSitesList: { site: string; totalMs: number; color: string }[] = [];
let otherExpanded = false;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function escapeHtml(str: string): string {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  if (m < 60) return `${m}m ${sec}s`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}
function parseTabTitle(title: string): { site: string; page: string } {
  const parts = title.split(" - ");
  return parts.length >= 2
    ? { site: parts[parts.length-1].trim(), page: parts.slice(0,-1).join(" - ").trim() }
    : { site: title, page: "" };
}
function computeDuration(tabs: TabSnapshot[], index: number): string {
  if (index === 0) return `${formatDuration(Date.now() - tabs[0].timestamp)} (active)`;
  const ms = tabs[index-1].timestamp - tabs[index].timestamp;
  return ms < 1000 ? "just a moment" : formatDuration(ms);
}
function getSiteDurationMs(tabs: TabSnapshot[], index: number): number {
  return index === 0 ? Date.now() - tabs[0].timestamp : tabs[index-1].timestamp - tabs[index].timestamp;
}
interface SiteTime { site: string; totalMs: number; color: string }
function computeSiteDurations(tabs: TabSnapshot[]): SiteTime[] {
  if (tabs.length === 0) { otherSitesList = []; otherExpanded = false; return []; }
  const msBySite = new Map<string,number>();
  for (let i = 0; i < tabs.length; i++) {
    const { site } = parseTabTitle(tabs[i].tabTitle);
    msBySite.set(site, (msBySite.get(site) || 0) + getSiteDurationMs(tabs, i));
  }
  const sorted = Array.from(msBySite.entries()).sort((a,b) => b[1]-a[1]).filter(([,ms]) => ms > 0);
  otherSitesList = []; otherExpanded = false;
  if (sorted.length <= 7) return sorted.map(([s,ms],i) => ({ site: s, totalMs: ms, color: RAINBOW[i%RAINBOW.length] }));
  const top7 = sorted.slice(0,7).map(([s,ms],i) => ({ site: s, totalMs: ms, color: RAINBOW[i] }));
  const otherMs = sorted.slice(7).reduce((sum,[,ms]) => sum+ms, 0);
  otherSitesList = sorted.slice(7).map(([s,ms]) => ({ site: s, totalMs: ms, color: "#555" }));
  return [...top7, { site: "Other", totalMs: otherMs, color: "#555" }];
}

function renderDonutChart(sites: SiteTime[]): void {
  const container = document.getElementById("chart-container");
  const section = document.getElementById("chart-section");
  if (!container || !section) return;
  if (sites.length === 0) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  const total = sites.reduce((s,st) => s+st.totalMs, 0);
  if (total <= 0) { section.classList.add("hidden"); return; }
  const cx=100, cy=100, r=72, sw=20, circ = 2*Math.PI*r;
  let svg = `<svg viewBox="0 0 200 200" class="donut">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${sw}"/>`;
  let offset = 0;
  for (const st of sites) {
    const dash = (st.totalMs/total)*circ;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${st.color}" stroke-width="${sw}" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" class="donut-segment"/>`;
    offset += dash;
  }
  svg += `<text x="${cx}" y="${cy-8}" text-anchor="middle" fill="var(--text)" font-size="22" font-weight="600">${formatDuration(total)}</text>`;
  svg += `<text x="${cx}" y="${cy+12}" text-anchor="middle" fill="var(--muted)" font-size="11">total</text></svg>`;
  let legend = `<div class="chart-legend">`;
  for (const st of sites) {
    const pct = Math.round((st.totalMs/total)*100);
    const isOther = st.site === "Other";
    legend += `<div class="legend-item${isOther?" legend-other":""}">
      <span class="legend-dot" style="background:${st.color}"></span>
      <span class="legend-label">${escapeHtml(st.site)}</span>
      <span class="legend-value">${formatDuration(st.totalMs)}</span>
      <span class="legend-pct">${pct}%</span>
      ${isOther && otherSitesList.length > 0 ? '<span class="legend-expand">▸</span>' : ""}
    </div>`;
    if (isOther && otherExpanded) {
      for (const sub of otherSitesList) {
        const sp = Math.round((sub.totalMs/total)*100);
        legend += `<div class="legend-item legend-sub">
          <span class="legend-dot" style="background:${sub.color};opacity:0.4"></span>
          <span class="legend-label">${escapeHtml(sub.site)}</span>
          <span class="legend-value">${formatDuration(sub.totalMs)}</span>
          <span class="legend-pct">${sp}%</span>
        </div>`;
      }
    }
  }
  legend += `</div>`;
  container.innerHTML = svg + legend;
  const otherRow = container.querySelector(".legend-other");
  if (otherRow) otherRow.addEventListener("click", () => { otherExpanded = !otherExpanded; renderDonutChart(sites); });
}

function renderStressGraph(history: StressPoint[]): void {
  const svg = document.getElementById("stress-graph") as unknown as SVGSVGElement | null;
  if (!svg) return;
  const w=300, h=80;
  if (history.length < 2) { svg.innerHTML = `<text x="150" y="40" text-anchor="middle" fill="var(--muted)" font-size="11">Collecting data…</text>`; return; }
  const pts = history.map((p,i) => `${(i/(history.length-1))*w},${h-(p.score/100)*h}`);
  svg.innerHTML = `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts.join(" ")}"/>
    <polygon fill="var(--accent)" fill-opacity="0.12" points="${pts.join(" ")} ${w},${h} 0,${h}"/>`;
}
function emotionColor(score: number): string {
  return score < 35 ? "#69F0AE" : score < 65 ? "#FFD54F" : "#FF5252";
}

function renderStress(data: StressPoint, history: StressPoint[]): void {
  const valEl = document.getElementById("stress-value");
  const hrsEl = document.getElementById("factor-hours");
  const swEl  = document.getElementById("factor-switches");
  const sitEl = document.getElementById("factor-sites");
  const underline = document.getElementById("logo-underline");
  const color = emotionColor(data.score);
  if (valEl) { valEl.textContent = String(data.score); valEl.style.color = color; }
  if (underline) underline.style.background = color;
  if (hrsEl) hrsEl.textContent = `${data.factors.hoursWorked.toFixed(1)}h`;
  if (swEl)  swEl.textContent  = `${data.factors.switchRate.toFixed(1)}/min`;
  if (sitEl) sitEl.textContent = String(data.factors.uniqueSites);
  renderStressGraph(history);
}

function renderLoneliness(data: LonelinessData): void {
  const section  = document.getElementById("loneliness-section");
  const status   = document.getElementById("loneliness-status");
  const detail   = document.getElementById("loneliness-detail");
  const barFill  = document.getElementById("loneliness-bar-fill");
  const cliEl    = document.getElementById("loneliness-cli");
  const fault    = document.getElementById("loneliness-fault");
  if (!section||!status||!detail||!barFill||!cliEl||!fault) return;
  if (data.socialMs + data.solitaryMs === 0) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  detail.textContent = `Social: ${formatDuration(data.socialMs)}  ·  Solitary: ${formatDuration(data.solitaryMs)}`;
  cliEl.textContent = `${Math.round(data.cli)}% solitary`;
  barFill.style.width = `${Math.min(data.cli,100)}%`;
  barFill.style.background = data.cli>60?"#FF5252":data.cli>40?"#FFD54F":"#69F0AE";
  if (data.faultTriggered) {
    status.textContent = "⚠ Social Deprivation Detected"; status.style.color = "#FF5252"; fault.classList.remove("hidden");
  } else {
    status.textContent = data.cli>60?"⚠ Low Social Connection":"✓ Socially Connected";
    status.style.color = data.cli>60?"#FFD54F":"#69F0AE"; fault.classList.add("hidden");
  }
}

const SURVEY_QUESTIONS = [
  { id:"stress-level", text:"How would you rate your current stress level?", em:"(1 = relaxed, 5 = overwhelmed)", options:["1","2","3","4","5"] },
  { id:"anxiety",  text:"Have you felt anxious today?",                    options:["Not at all","A little","Moderately","Very"] },
  { id:"social",   text:"Have you had meaningful social interaction today?",options:["Yes","No"] },
  { id:"energy",   text:"How is your energy level?",                       options:["Low","Medium","High"] },
  { id:"overwhelm",text:"Are you feeling overwhelmed by your workload?",   options:["Not at all","A little","Somewhat","Very"] },
  { id:"break",    text:"Have you taken a break in the last 2 hours?",     options:["Yes","No"] },
  { id:"sleep",    text:"How was your sleep quality last night?",           options:["Poor","Fair","Good"] },
];
let surveyAnswers: Record<string,string> = {};
function cancelSurvey(): void { document.getElementById("survey-overlay")?.classList.add("hidden"); }
function openSurvey(): void {
  const overlay = document.getElementById("survey-overlay");
  const container = document.getElementById("survey-questions");
  if (!overlay || !container) return;
  surveyAnswers = {};
  container.innerHTML = SURVEY_QUESTIONS.map(q => `
    <div class="survey-question">
      <div class="survey-q-text">${q.text} <span class="survey-em">${q.em||""}</span></div>
      <div class="survey-q-options" data-q="${q.id}">${q.options.map(o=>`<span class="survey-opt" data-value="${o}">${o}</span>`).join("")}</div>
    </div>`).join("");
  container.querySelectorAll(".survey-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.parentElement; if (!parent) return;
      parent.querySelectorAll(".survey-opt").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      surveyAnswers[parent.dataset.q||""] = (btn as HTMLElement).dataset.value||"";
    });
  });
  overlay.classList.remove("hidden");
}
function submitSurvey(): void {
  if (Object.keys(surveyAnswers).length < SURVEY_QUESTIONS.length) return;
  const stressDelta = (Number(surveyAnswers["stress-level"])||3) - 3;
  const adj =
    stressDelta * 5 +
    ({"Not at all":-8,"A little":0,"Moderately":8,"Very":16}[surveyAnswers["anxiety"]]||0) +
    ({"Yes":-12,"No":8}[surveyAnswers["social"]]||0) +
    ({"Low":8,"Medium":0,"High":-8}[surveyAnswers["energy"]]||0) +
    ({"Not at all":-8,"A little":0,"Somewhat":8,"Very":16}[surveyAnswers["overwhelm"]]||0) +
    ({"Yes":-8,"No":8}[surveyAnswers["break"]]||0) +
    ({"Poor":12,"Fair":0,"Good":-8}[surveyAnswers["sleep"]]||0);
  void window.tabDashboard.setSurveyAdjustment(adj);
  document.getElementById("survey-overlay")?.classList.add("hidden");
  showNotification("Survey submitted. Stress score adjusted.");
}

let breathInterval: ReturnType<typeof setInterval> | null = null;
let warningInterval: ReturnType<typeof setInterval> | null = null;
function startBreathing(): void {
  const overlay  = document.getElementById("alarm-overlay");
  const circle   = document.getElementById("breath-circle");
  const timerEl  = document.getElementById("breath-timer");
  const textEl   = document.getElementById("breath-text");
  if (!overlay||!circle||!timerEl||!textEl) return;
  if (breathInterval) { clearInterval(breathInterval); breathInterval = null; }
  if (warningInterval) { clearInterval(warningInterval); warningInterval = null; }
  overlay.classList.remove("hidden");
  circle.style.transform = "scale(0.4)";
  textEl.textContent = "Your stress levels are too high — take a deep breath";
  timerEl.textContent = "3";
  let wCount = 3;
  warningInterval = setInterval(() => { wCount--; if (wCount > 0) timerEl.textContent = String(wCount); }, 1000);
  setTimeout(() => {
    if (warningInterval) { clearInterval(warningInterval); warningInterval = null; }
    let remaining = 25;
    const tick = (): void => {
      const phase = 25 - remaining, cycle = phase % 5, inOut = cycle < 2.5;
      const progress = inOut ? cycle/2.5 : 1-(cycle-2.5)/2.5;
      circle.style.transform = `scale(${0.4 + progress*0.6})`;
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

function renderTabs(tabs: TabSnapshot[]): void {
  currentTabs = tabs;
  const list     = document.getElementById("tab-list");
  const section  = document.getElementById("tabs-section");
  const count    = document.getElementById("toggle-count");
  const emptyMsg = document.getElementById("empty-session-msg");
  if (!list||!section||!count||!emptyMsg) return;
  if (tabs.length === 0) {
    section.classList.add("hidden"); emptyMsg.classList.remove("hidden");
    list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    renderDonutChart(computeSiteDurations(tabs)); return;
  }
  emptyMsg.classList.add("hidden"); section.classList.remove("hidden"); count.textContent = String(tabs.length);
  list.innerHTML = tabs.map((t,i) => {
    const { site, page } = parseTabTitle(t.tabTitle);
    const display = page ? `${escapeHtml(site)} - ${escapeHtml(page)}` : escapeHtml(site);
    return `<div class="tab-entry">
      <span class="browser-badge ${t.browser}">${t.browser}</span>
      <div class="tab-info"><span class="tab-title" title="${escapeHtml(t.tabTitle)}">${display}</span><span class="tab-duration">${computeDuration(tabs,i)}</span></div>
      <span class="tab-time">${formatTime(t.timestamp)}</span>
    </div>`;
  }).join("");
  renderDonutChart(computeSiteDurations(tabs));
  if (!liveTimer) {
    liveTimer = setInterval(() => {
      if (currentTabs.length > 0) {
        document.querySelectorAll(".tab-duration").forEach((el,i) => { if (i<currentTabs.length) el.textContent = computeDuration(currentTabs,i); });
        renderDonutChart(computeSiteDurations(currentTabs));
      }
    }, 1000);
  }
}

function setPermissionBanner(ok: boolean): void {
  document.getElementById("permission-banner")?.classList.toggle("hidden", ok);
}

let selectedContactId: string | null = null;
function renderContactsDropdown(contacts: Contact[]): void {
  const section = document.getElementById("contacts-section");
  const select  = document.getElementById("contact-select") as HTMLSelectElement|null;
  if (!section||!select) return;
  if (contacts.length === 0) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  const prev = selectedContactId;
  select.innerHTML = `<option value="">-- Select Contact --</option>`;
  for (const c of contacts) {
    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = `${c.name} — ${c.role}`;
    if (c.id === prev) opt.selected = true;
    select.appendChild(opt);
  }
  if (!prev||!contacts.some(c=>c.id===prev)) { selectedContactId=null; select.value=""; }
  hideMessageArea();
}
function hideMessageArea(): void {
  document.getElementById("contact-message-area")?.classList.add("hidden");
  document.getElementById("contact-no-method")?.classList.add("hidden");
  document.getElementById("contact-message-input-area")?.classList.add("hidden");
}
function onContactAction(): void {
  const select = document.getElementById("contact-select") as HTMLSelectElement|null;
  if (!select||!select.value) return;
  selectedContactId = select.value;
  document.getElementById("contact-message-area")?.classList.remove("hidden");
  void window.tabDashboard.getContacts().then(contacts => {
    const c = contacts.find(ct=>ct.id===select.value);
    if (!c) return;
    if (!c.email && !c.phone) {
      document.getElementById("contact-no-method")?.classList.remove("hidden");
      document.getElementById("contact-message-input-area")?.classList.add("hidden");
    } else {
      document.getElementById("contact-no-method")?.classList.add("hidden");
      document.getElementById("contact-message-input-area")?.classList.remove("hidden");
    }
  });
}
function onContactSend(): void {
  const select = document.getElementById("contact-select") as HTMLSelectElement|null;
  const input  = document.getElementById("contact-message-input") as HTMLTextAreaElement|null;
  if (!select||!input||!select.value) return;
  const message = input.value.trim(); if (!message) return;
  window.tabDashboard.sendMessage(select.value, message);
  input.value = ""; hideMessageArea();
}
async function refreshContacts(): Promise<void> { renderContactsDropdown(await window.tabDashboard.getContacts()); }
async function addContactSubmit(): Promise<void> {
  const name  = (document.getElementById("contact-name-input")  as HTMLInputElement).value.trim();
  const role  = (document.getElementById("contact-role-input")  as HTMLInputElement).value.trim();
  const email = (document.getElementById("contact-email-input") as HTMLInputElement).value.trim();
  const phone = (document.getElementById("contact-phone-input") as HTMLInputElement).value.trim();
  if (!name) return;
  await window.tabDashboard.addContact({ name, role, email, phone });
  (document.getElementById("contact-name-input")  as HTMLInputElement).value = "";
  (document.getElementById("contact-role-input")  as HTMLInputElement).value = "";
  (document.getElementById("contact-email-input") as HTMLInputElement).value = "";
  (document.getElementById("contact-phone-input") as HTMLInputElement).value = "";
  document.getElementById("contact-config-overlay")?.classList.add("hidden");
  await refreshContacts();
}

async function init(): Promise<void> {
  const api = window.tabDashboard;
  if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();

  const [tabs, permission] = await Promise.all([api.getTabs(), api.getPermission()]);
  renderTabs(tabs); setPermissionBanner(permission);

  const [stressData, stressHistory] = await Promise.all([api.getStress(), api.getStressHistory()]);
  renderStress(stressData, stressHistory);

  api.onTabsInit(t => renderTabs(t));
  api.onTabsUpdate(t => renderTabs(t));
  api.onPermissionStatus(ok => setPermissionBanner(ok));
  api.onStressUpdate((data, history) => renderStress(data, history));

  const lonelinessData = await api.getLoneliness();
  renderLoneliness(lonelinessData);
  api.onSocialUpdate(data => renderLoneliness(data));

  let lastFaultNotif = 0;
  api.onFaultTriggered((fault) => {
    const el = document.getElementById("active-fault"); if (!el) return;
    el.textContent = `⚠ ${fault.code}: ${fault.message}`; el.classList.remove("hidden");
    const now = Date.now(); if (now - lastFaultNotif > 120000) { lastFaultNotif = now; showNotification(fault.message); }
  });

  api.onAutoBreath(() => startBreathing());

  const slider  = document.getElementById("sleep-slider") as HTMLInputElement|null;
  const display = document.getElementById("sleep-display");
  if (slider && display) {
    slider.value = String(await api.getSleepHours()); display.textContent = `${slider.value}h`;
    slider.addEventListener("input", () => { display.textContent = `${slider.value}h`; void api.setSleepHours(parseFloat(slider.value)); });
  }

  // Tab collapse toggle
  const toggle   = document.getElementById("toggle-tabs");
  const collapse = document.getElementById("tabs-collapse");
  const icon     = document.getElementById("toggle-icon");
  if (toggle && collapse && icon) {
    toggle.addEventListener("click", () => { collapse.classList.toggle("open"); icon.classList.toggle("open"); });
  }

  document.getElementById("open-prefs-btn")?.addEventListener("click", () => api.openAccessibilityPrefs());
  document.getElementById("survey-btn")?.addEventListener("click", openSurvey);
  document.getElementById("survey-submit")?.addEventListener("click", submitSurvey);
  document.getElementById("survey-cancel")?.addEventListener("click", cancelSurvey);
  document.getElementById("survey-cancel-btn")?.addEventListener("click", cancelSurvey);
  document.getElementById("rage-btn")?.addEventListener("click", () => api.openRageRoom());

  void refreshContacts();
  document.getElementById("contact-action-btn")?.addEventListener("click", onContactAction);
  document.getElementById("contact-send-btn")?.addEventListener("click", onContactSend);
  document.getElementById("contacts-configure-btn")?.addEventListener("click", () => document.getElementById("contact-config-overlay")?.classList.remove("hidden"));
  document.getElementById("contact-config-cancel")?.addEventListener("click", () => document.getElementById("contact-config-overlay")?.classList.add("hidden"));
  document.getElementById("contact-config-add")?.addEventListener("click", () => void addContactSubmit());
}

init();
