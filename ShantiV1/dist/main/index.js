"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const tabReader_1 = require("./tabReader");
let tray = null;
let dashboardWindow = null;
const tabReader = new tabReader_1.TabReader();
const sessionTabs = [];
let hasPermission = false;
function createTrayIcon() {
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const cx = x - size / 2 + 0.5;
            const cy = y - size / 2 + 0.5;
            const inside = Math.sqrt(cx * cx + cy * cy) < size / 2 - 1;
            const i = (y * size + x) * 4;
            buf[i] = 255;
            buf[i + 1] = 255;
            buf[i + 2] = 255;
            buf[i + 3] = inside ? 220 : 0;
        }
    }
    return electron_1.nativeImage.createFromBuffer(buf, { width: size, height: size });
}
function createDashboardWindow() {
    const win = new electron_1.BrowserWindow({
        width: 520,
        height: 650,
        show: false,
        frame: true,
        resizable: true,
        title: "Tab Dashboard",
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    win.loadFile(path_1.default.join(__dirname, "../../src/renderer/index.html"));
    win.on("close", (e) => {
        e.preventDefault();
        win.hide();
    });
    return win;
}
function showDashboard() {
    if (!dashboardWindow) {
        dashboardWindow = createDashboardWindow();
    }
    dashboardWindow.webContents.once("did-finish-load", () => {
        dashboardWindow?.webContents.send("tabs-init", sessionTabs);
        dashboardWindow?.webContents.send("permission-status", hasPermission);
    });
    dashboardWindow.show();
    dashboardWindow.focus();
}
function buildContextMenu() {
    return electron_1.Menu.buildFromTemplate([
        { label: "Open Dashboard", click: showDashboard },
        { type: "separator" },
        { label: "Quit", click: () => electron_1.app.exit(0) },
    ]);
}
electron_1.app.whenReady().then(() => {
    if (process.platform === "darwin")
        electron_1.app.dock?.hide();
    const icon = createTrayIcon();
    tray = new electron_1.Tray(icon);
    tray.setToolTip("Tab Dashboard");
    tray.setContextMenu(buildContextMenu());
    tray.on("click", showDashboard);
    electron_1.ipcMain.handle("get-tabs", () => sessionTabs);
    electron_1.ipcMain.handle("get-permission", () => hasPermission);
    electron_1.ipcMain.on("clear-tabs", () => {
        sessionTabs.length = 0;
        dashboardWindow?.webContents.send("tabs-update", sessionTabs);
    });
    // Open macOS Accessibility prefs when user clicks the banner button
    electron_1.ipcMain.on("open-accessibility-prefs", () => {
        void electron_1.shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
    });
    tabReader.start((snapshot) => {
        sessionTabs.unshift(snapshot);
        if (dashboardWindow?.isVisible()) {
            dashboardWindow.webContents.send("tabs-update", sessionTabs);
        }
    }, (ok) => {
        hasPermission = ok;
        dashboardWindow?.webContents.send("permission-status", ok);
    });
});
electron_1.app.on("window-all-closed", () => {
    // Keep running as a menu bar app
});
electron_1.app.on("before-quit", () => {
    tabReader.stop();
});
//# sourceMappingURL=index.js.map