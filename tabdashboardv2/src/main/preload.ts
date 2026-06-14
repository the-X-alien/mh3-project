import { contextBridge, ipcRenderer } from "electron";
import { TabSnapshot } from "./tabReader";

interface StressPoint {
  score: number;
  timestamp: number;
  factors: { hoursWorked: number; switchRate: number; uniqueSites: number; sleepHours: number };
}

interface LonelinessData {
  socialMs: number;
  solitaryMs: number;
  cli: number;
  faultTriggered: boolean;
}

interface FaultData {
  code: string;
  message: string;
}

interface Contact {
  id: string; name: string; role: string; email: string; phone: string;
}

contextBridge.exposeInMainWorld("tabDashboard", {
  getTabs: (): Promise<TabSnapshot[]> => ipcRenderer.invoke("get-tabs"),
  getPermission: (): Promise<boolean> => ipcRenderer.invoke("get-permission"),
  openAccessibilityPrefs: (): void => { ipcRenderer.send("open-accessibility-prefs"); },
  onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void): void => {
    ipcRenderer.on("tabs-update", (_e, tabs: TabSnapshot[]) => cb(tabs));
  },
  onTabsInit: (cb: (tabs: TabSnapshot[]) => void): void => {
    ipcRenderer.on("tabs-init", (_e, tabs: TabSnapshot[]) => cb(tabs));
  },
  onPermissionStatus: (cb: (ok: boolean) => void): void => {
    ipcRenderer.on("permission-status", (_e, ok: boolean) => cb(ok));
  },

  // Stress score
  getStress: (): Promise<StressPoint> => ipcRenderer.invoke("get-stress"),
  getStressHistory: (): Promise<StressPoint[]> => ipcRenderer.invoke("get-stress-history"),
  getSleepHours: (): Promise<number> => ipcRenderer.invoke("get-sleep-hours"),
  setSleepHours: (h: number): Promise<void> => ipcRenderer.invoke("set-sleep-hours", h),
  onStressUpdate: (cb: (data: StressPoint, history: StressPoint[]) => void): void => {
    ipcRenderer.on("stress-update", (_e, data: StressPoint, history: StressPoint[]) => cb(data, history));
  },

  // Loneliness / Social
  getLoneliness: (): Promise<LonelinessData> => ipcRenderer.invoke("get-loneliness"),
  onSocialUpdate: (cb: (data: LonelinessData) => void): void => {
    ipcRenderer.on("social-update", (_e, data: LonelinessData) => cb(data));
  },

  // Fault codes
  onFaultTriggered: (cb: (fault: FaultData) => void): void => {
    ipcRenderer.on("fault-triggered", (_e, fault: FaultData) => cb(fault));
  },

  // Auto-breath trigger
  onAutoBreath: (cb: () => void): void => {
    ipcRenderer.on("auto-breath", () => cb());
  },

  // Survey
  setSurveyAdjustment: (adj: number): Promise<void> => ipcRenderer.invoke("set-survey-adjustment", adj),
  getSurveyAdjustment: (): Promise<number | null> => ipcRenderer.invoke("get-survey-adjustment"),

  // Rage Room
  openRageRoom: (): void => { ipcRenderer.send("open-rage-room"); },

  // Alarm / breathing
  getAlarmState: (): Promise<boolean> => ipcRenderer.invoke("get-alarm-state"),
  clearAlarm: (): void => { ipcRenderer.send("clear-alarm"); },
  onAlarmState: (cb: (active: boolean) => void): void => {
    ipcRenderer.on("alarm-state", (_e, active: boolean) => cb(active));
  },

  // Breathing completion
  breathComplete: (): void => { ipcRenderer.send("breath-complete"); },

  // Trusted Contacts
  getContacts: (): Promise<Contact[]> => ipcRenderer.invoke("get-contacts"),
  addContact: (c: Omit<Contact, "id">): Promise<void> => ipcRenderer.invoke("add-contact", c),
  removeContact: (id: string): Promise<void> => ipcRenderer.invoke("remove-contact", id),
  contactPerson: (id: string, method: "email" | "sms"): void => { ipcRenderer.send("contact-person", id, method); },
  sendMessage: (id: string, message: string): void => { ipcRenderer.send("send-message", id, message); },

  // Open web dashboard
  openWebDashboard: (): void => { ipcRenderer.send("open-web-dashboard"); },
});
