import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, NativeImage, shell } from "electron";
import path from "path";
import { TabReader, TabSnapshot } from "./tabReader";

let tray: Tray | null = null;
let dashboardWindow: BrowserWindow | null = null;
const tabReader = new TabReader();
const sessionTabs: TabSnapshot[] = [];
let hasPermission = false;

function createTrayIcon(): NativeImage {
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
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createDashboardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 650,
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
  }
  dashboardWindow.webContents.once("did-finish-load", () => {
    dashboardWindow?.webContents.send("tabs-init", sessionTabs);
    dashboardWindow?.webContents.send("permission-status", hasPermission);
  });
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

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.hide();

  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("Tab Dashboard");
  tray.setContextMenu(buildContextMenu());
  tray.on("click", showDashboard);

  ipcMain.handle("get-tabs", () => sessionTabs);
  ipcMain.handle("get-permission", () => hasPermission);

  ipcMain.on("clear-tabs", () => {
    sessionTabs.length = 0;
    dashboardWindow?.webContents.send("tabs-update", sessionTabs);
  });

  // Open macOS Accessibility prefs when user clicks the banner button
  ipcMain.on("open-accessibility-prefs", () => {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  });

  tabReader.start(
    (snapshot) => {
      sessionTabs.unshift(snapshot);
      if (dashboardWindow?.isVisible()) {
        dashboardWindow.webContents.send("tabs-update", sessionTabs);
      }
    },
    (ok) => {
      hasPermission = ok;
      dashboardWindow?.webContents.send("permission-status", ok);
    }
  );
});

app.on("window-all-closed", () => {
  // Keep running as a menu bar app
});

app.on("before-quit", () => {
  tabReader.stop();
});
