"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("tabDashboard", {
    getTabs: () => electron_1.ipcRenderer.invoke("get-tabs"),
    getPermission: () => electron_1.ipcRenderer.invoke("get-permission"),
    clearTabs: () => { electron_1.ipcRenderer.send("clear-tabs"); },
    openAccessibilityPrefs: () => { electron_1.ipcRenderer.send("open-accessibility-prefs"); },
    onTabsUpdate: (cb) => {
        electron_1.ipcRenderer.on("tabs-update", (_e, tabs) => cb(tabs));
    },
    onTabsInit: (cb) => {
        electron_1.ipcRenderer.once("tabs-init", (_e, tabs) => cb(tabs));
    },
    onPermissionStatus: (cb) => {
        electron_1.ipcRenderer.on("permission-status", (_e, ok) => cb(ok));
    },
});
//# sourceMappingURL=preload.js.map