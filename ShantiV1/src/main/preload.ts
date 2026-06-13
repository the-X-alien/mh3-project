import { contextBridge, ipcRenderer } from "electron";
import { TabSnapshot } from "./tabReader";

contextBridge.exposeInMainWorld("tabDashboard", {
  getTabs: (): Promise<TabSnapshot[]> => ipcRenderer.invoke("get-tabs"),
  getPermission: (): Promise<boolean> => ipcRenderer.invoke("get-permission"),
  clearTabs: (): void => { ipcRenderer.send("clear-tabs"); },
  openAccessibilityPrefs: (): void => { ipcRenderer.send("open-accessibility-prefs"); },
  onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void): void => {
    ipcRenderer.on("tabs-update", (_e, tabs: TabSnapshot[]) => cb(tabs));
  },
  onTabsInit: (cb: (tabs: TabSnapshot[]) => void): void => {
    ipcRenderer.once("tabs-init", (_e, tabs: TabSnapshot[]) => cb(tabs));
  },
  onPermissionStatus: (cb: (ok: boolean) => void): void => {
    ipcRenderer.on("permission-status", (_e, ok: boolean) => cb(ok));
  },
});
