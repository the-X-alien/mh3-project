import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, NativeImage, shell, screen } from "electron";
import { execFile } from "child_process";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCanvas } = require("canvas");
import { TabReader, TabSnapshot } from "./tabReader";

let tray: Tray | null = null;
let dashboardWindow: BrowserWindow | null = null;
const tabReader = new TabReader();
const sessionTabs: TabSnapshot[] = [];
let hasPermission = false;

// ── Rapid switch detection ──
const switchTimestamps: number[] = [];
let lastRapidSwitchNotif = 0;

// ── Screen-time tracking ──
let lastActivityTime = 0;
let sessionStartTime = 0;
let lastBreakNotif = 0;
const BREAK_INTERVAL_MS = 20 * 60 * 1000;
const BREAK_RESET_MS   = 5 * 60 * 1000;
const BREAK_COOLDOWN   = 10 * 60 * 1000;
const RAPID_WINDOW_MS  = 60 * 1000;
const RAPID_CHILL      = 7;
const RAPID_ALARM      = 10;
const RAPID_COOLDOWN   = 15 * 1000;

let alarmActive = false;
let lastSocialVisitMs = 0;
let lastAutoBreath = 0;
let stressModifier = 0;

interface Contact {
  id: string; name: string; role: string; email: string; phone: string;
}
const contacts: Contact[] = [];
let contactIdCounter = 0;

// ── Stress score ──
let sleepHours = 8;
let surveyAdjustment: number | null = null;
interface StressPoint {
  score: number;
  timestamp: number;
  factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number };
}
const stressHistory: StressPoint[] = [];

function createTrayIcon(score?: number): NativeImage {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Draw 🙏 emoji then recolor to white
  ctx.clearRect(0, 0, size, size);
  ctx.font = "22px 'Apple Color Emoji', serif";
  ctx.textBaseline = "top";
  ctx.fillText("🙏", 2, 1);
  // Recolor emoji to white while preserving shape
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  // Draw stress-color underline bar at bottom
  let color = "#888888";
  if (score !== undefined) {
    if (score < 35)      color = "#69F0AE"; // green = calm
    else if (score < 65) color = "#FFD54F"; // yellow = tense
    else                 color = "#FF5252"; // red = stressed
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 28, size, 4);

  const buf: Buffer = canvas.toBuffer("image/png");
  return nativeImage.createFromBuffer(buf).resize({ width: 16, height: 16 });
}

function showNotification(title: string, body: string): void {
  execFile("/usr/bin/osascript", ["-e", `display notification "${body.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`], (err) => {
    if (err) console.error("Notification failed:", err);
  });
}

function createDashboardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 850,
    show: false,
    frame: true,
    resizable: true,
    title: "Tab Dashboard",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "../../src/renderer/index.html"));

  win.on("close", (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}

function showDashboard(): void {
  if (!dashboardWindow) {
    dashboardWindow = createDashboardWindow();
    dashboardWindow.webContents.once("did-finish-load", () => {
      dashboardWindow?.webContents.send("tabs-init", sessionTabs);
      dashboardWindow?.webContents.send("permission-status", hasPermission);
      dashboardWindow?.webContents.send("social-update", computeLoneliness());
    });
  } else {
    dashboardWindow.webContents.send("tabs-init", sessionTabs);
    dashboardWindow.webContents.send("permission-status", hasPermission);
    dashboardWindow.webContents.send("social-update", computeLoneliness());
  }
  dashboardWindow.show();
  dashboardWindow.focus();
}

function buildContextMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Open Dashboard", click: showDashboard },
    { type: "separator" },
    { label: "Quit", click: () => app.exit(0) },
  ]);
}

function parseSite(title: string): string {
  const parts = title.split(" - ");
  return parts.length >= 2 ? parts[parts.length - 1].trim() : title;
}

function parseTabTitle(title: string): { site: string; page: string } {
  const parts = title.split(" - ");
  if (parts.length >= 2) return { site: parts[parts.length - 1].trim(), page: parts.slice(0, -1).join(" - ").trim() };
  return { site: title, page: "" };
}

interface LonelinessData {
  socialMs: number;
  solitaryMs: number;
  cli: number;
  faultTriggered: boolean;
}

function computeLoneliness(): LonelinessData {
  const now = Date.now();
  let socialMs = 0, solitaryMs = 0;
  const socialSites = new Set(["messages", "whatsapp", "discord", "instagram", "facetime", "zoom", "telegram", "messenger", "snapchat", "signal", "slack", "wechat", "google meet", "teams", "skype"]);
  for (let i = 0; i < sessionTabs.length; i++) {
    const ms = i === 0 ? now - sessionTabs[i].timestamp : sessionTabs[i - 1].timestamp - sessionTabs[i].timestamp;
    const { site } = parseTabTitle(sessionTabs[i].tabTitle);
    if (socialSites.has(site.toLowerCase().trim())) socialMs += ms; else solitaryMs += ms;
  }
  const total = socialMs + solitaryMs;
  const cli = total > 0 ? (solitaryMs / total) * 100 : 0;
  const faultTriggered = solitaryMs > 3 * 3600000 && cli > 60 && (lastSocialVisitMs === 0 || (now - lastSocialVisitMs > 3 * 3600000));
  return { socialMs, solitaryMs, cli, faultTriggered };
}

function calculateStress(): StressPoint {
  const now = Date.now();
  let totalMs = 0;
  for (let i = 0; i < sessionTabs.length; i++) {
    if (i === 0) totalMs += now - sessionTabs[i].timestamp;
    else totalMs += sessionTabs[i - 1].timestamp - sessionTabs[i].timestamp;
  }
  const hoursWorked = totalMs / 3600000;
  const fiveMinAgo = now - 5 * 60 * 1000;
  const recentSwitches = switchTimestamps.filter(t => t >= fiveMinAgo).length;
  const switchRate = recentSwitches / 5;
  const uniqueSites = new Set(sessionTabs.map(t => parseSite(t.tabTitle))).size;

  const screenScore = Math.min(hoursWorked / 12, 1) * 30;
  const switchScore = Math.min(switchRate / 8, 1) * 30;
  const workloadScore = Math.min(uniqueSites / 10, 1) * 20;
  const sleepScore = Math.max(0, (8 - sleepHours) / 8) * 20;

  let score = Math.min(100, Math.round(screenScore + switchScore + workloadScore + sleepScore));

  // Apply survey adjustment (delta) if available
  if (surveyAdjustment !== null) {
    score = Math.max(0, Math.min(100, score + surveyAdjustment));
  }

  // Apply stress modifier (e.g. -40 after breathing, decays toward 0)
  score = Math.max(0, Math.min(100, score + stressModifier));

  return { score, timestamp: now, factors: { hoursWorked, switchRate, uniqueSites, sleepHours } };
}

function sendStressUpdate(): void {
  const data = calculateStress();
  stressHistory.push(data);
  if (stressHistory.length > 60) stressHistory.shift();

  const loneliness = computeLoneliness();

  if (loneliness.faultTriggered) {
    dashboardWindow?.webContents.send("fault-triggered", { code: "ERR_SOCIAL_DEPRIVATION", message: "Your battery is low and you haven't connected with anyone today. Message someone you trust." });
  }

  if (dashboardWindow?.isVisible()) {
    dashboardWindow.webContents.send("stress-update", data, [...stressHistory]);
    dashboardWindow.webContents.send("social-update", loneliness);
  }

  // Auto-trigger breathing when stress > 75 (5 min cooldown)
  const now = Date.now();
  if (data.score > 75 && now - lastAutoBreath > 300000) {
    lastAutoBreath = now;
    dashboardWindow?.webContents.send("auto-breath");
    showNotification("Shanti", "Your stress is high. Take a moment to breathe.");
  }

  const tag = data.score > 70 ? "HIGH" : data.score >= 40 ? "MED" : "LOW";
  if (tray) {
    tray.setToolTip(`Shanti Stress: ${data.score} (${tag})`);
    tray.setImage(createTrayIcon(data.score));
  }
}

let rageWindow: BrowserWindow | null = null;

function openRageRoom(): void {
  if (rageWindow && !rageWindow.isDestroyed()) { rageWindow.show(); rageWindow.focus(); return; }
  const size = screen.getPrimaryDisplay().workAreaSize;
  rageWindow = new BrowserWindow({
    width: Math.min(700, size.width),
    height: Math.min(600, size.height),
    title: "Rage Room",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  rageWindow.loadFile(path.join(__dirname, "../../src/renderer/rage-room.html"));
  rageWindow.setMenuBarVisibility(false);
  rageWindow.on("closed", () => { rageWindow = null; });
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.hide();

  showNotification("Shanti", "Shanti Session has started.");

  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("Shanti Stress: -- (--)");
  tray.setContextMenu(buildContextMenu());
  tray.on("click", showDashboard);

  ipcMain.handle("get-tabs", () => sessionTabs);
  ipcMain.handle("get-permission", () => hasPermission);

  // ── Stress IPC ──
  ipcMain.handle("get-stress", () => calculateStress());
  ipcMain.handle("get-stress-history", () => [...stressHistory]);
  ipcMain.handle("get-sleep-hours", () => sleepHours);
  ipcMain.handle("set-sleep-hours", (_e, hours: number) => { sleepHours = hours; });

  // ── Loneliness IPC ──
  ipcMain.handle("get-loneliness", () => computeLoneliness());

  // ── Survey IPC ──
  ipcMain.handle("set-survey-adjustment", (_e, adj: number) => { surveyAdjustment = adj; });
  ipcMain.handle("get-survey-adjustment", () => surveyAdjustment);

  // ── Rage Room IPC ──
  ipcMain.on("open-rage-room", () => openRageRoom());

  // ── Alarm IPC ──
  ipcMain.handle("get-alarm-state", () => alarmActive);
  ipcMain.on("clear-alarm", () => { alarmActive = false; dashboardWindow?.webContents.send("alarm-state", false); });

  ipcMain.on("breath-complete", () => {
    stressModifier = -40;
  });

  // ── Contacts IPC ──
  ipcMain.handle("get-contacts", () => contacts);
  ipcMain.handle("add-contact", (_e, c: Omit<Contact, "id">) => {
    const id = String(++contactIdCounter);
    contacts.push({ id, ...c });
  });
  ipcMain.handle("remove-contact", (_e, id: string) => {
    const idx = contacts.findIndex(c => c.id === id);
    if (idx !== -1) contacts.splice(idx, 1);
  });
  ipcMain.on("contact-person", (_e, id: string, method: "email" | "sms") => {
    const c = contacts.find(ct => ct.id === id);
    if (!c) return;
    if (method === "email" && c.email) {
      void shell.openExternal(`mailto:${c.email}`);
    } else if (method === "sms" && c.phone) {
      void shell.openExternal(`sms:${c.phone}`);
    }
  });

  ipcMain.on("send-message", (_e, id: string, message: string) => {
    const c = contacts.find(ct => ct.id === id);
    if (!c) return;
    const encoded = encodeURIComponent(message);
    if (c.email) {
      void shell.openExternal(`mailto:${c.email}?body=${encoded}`);
    } else if (c.phone) {
      void shell.openExternal(`sms:${c.phone}?body=${encoded}`);
    }
  });

  ipcMain.on("open-web-dashboard", () => {
    void shell.openExternal("https://mh3-project.vercel.app/dashboard");
  });

  ipcMain.on("open-accessibility-prefs", () => {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  });

  sendStressUpdate();
  setInterval(() => {
    sendStressUpdate();
    // Decay stress modifier toward 0 (5 per cycle = every 30s)
    if (stressModifier < 0) {
      stressModifier = Math.min(0, stressModifier + 5);
    } else if (stressModifier > 0) {
      stressModifier = Math.max(0, stressModifier - 5);
    }
  }, 30000);

  tabReader.start(
    (snapshot) => {
      const now = Date.now();
      const cutoff = now - RAPID_WINDOW_MS;
      while (switchTimestamps.length > 0 && switchTimestamps[0]! < cutoff) switchTimestamps.shift();
      switchTimestamps.push(now);
      const count = switchTimestamps.length;

      if (count >= RAPID_ALARM && now - lastRapidSwitchNotif > RAPID_COOLDOWN) {
        lastRapidSwitchNotif = now;
        alarmActive = true;
        dashboardWindow?.webContents.send("alarm-state", true);
        dashboardWindow?.webContents.send("auto-breath");
        showNotification("Shanti", "You're switching tabs too much! Take a breath.");
      } else if (count >= RAPID_CHILL && now - lastRapidSwitchNotif > RAPID_COOLDOWN) {
        lastRapidSwitchNotif = now;
        showNotification("Shanti", "Chill out and focus on one task.");
      }

      const { site: curSite } = parseTabTitle(snapshot.tabTitle);
      const socialSites = new Set(["messages", "whatsapp", "discord", "instagram", "facetime", "zoom", "telegram", "messenger", "snapchat", "signal", "slack", "wechat", "google meet", "teams", "skype"]);
      if (socialSites.has(curSite.toLowerCase().trim())) lastSocialVisitMs = Date.now();

      sessionTabs.unshift(snapshot);
      if (dashboardWindow?.isVisible()) {
        dashboardWindow.webContents.send("tabs-update", sessionTabs);
      }
    },
    (ok) => {
      hasPermission = ok;
      dashboardWindow?.webContents.send("permission-status", ok);
    },
    () => {
      const now = Date.now();
      lastActivityTime = now;
      if (sessionStartTime === 0) {
        sessionStartTime = now;
      } else if (now - lastActivityTime > BREAK_RESET_MS) {
        sessionStartTime = now;
      }
    }
  );

  setInterval(() => {
    if (sessionStartTime === 0) return;
    const now = Date.now();
    if (now - lastActivityTime > BREAK_RESET_MS) {
      sessionStartTime = 0;
      return;
    }
    const elapsed = now - sessionStartTime;
    if (elapsed >= BREAK_INTERVAL_MS && now - lastBreakNotif > BREAK_COOLDOWN) {
      lastBreakNotif = now;
      sessionStartTime = now;
      showNotification("Shanti", "You've been using the screen for 20 minutes straight. Step away for a moment!");
    }
  }, 10000);
});

app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  tabReader.stop();
});
