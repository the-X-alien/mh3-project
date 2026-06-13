"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabReader = void 0;
const active_win_1 = __importDefault(require("active-win"));
const BROWSER_MAP = {
    "google chrome": "chrome",
    "chrome": "chrome",
    "chromium": "chrome",
    "firefox": "firefox",
    "mozilla firefox": "firefox",
    "safari": "safari",
    "microsoft edge": "edge",
    "msedge": "edge",
};
function detectBrowser(ownerName) {
    const lower = ownerName.toLowerCase();
    for (const [key, value] of Object.entries(BROWSER_MAP)) {
        if (lower.includes(key))
            return value;
    }
    return null;
}
function extractTabTitle(windowTitle) {
    // Browsers suffix their name: "Tab Title - Google Chrome" / "Tab Title — Mozilla Firefox"
    const suffixes = [
        " - Google Chrome",
        " — Mozilla Firefox",
        " - Mozilla Firefox",
        " - Safari",
        " - Microsoft Edge",
    ];
    for (const sfx of suffixes) {
        if (windowTitle.endsWith(sfx)) {
            return windowTitle.slice(0, -sfx.length).trim();
        }
    }
    // Generic fallback: strip last " - Anything"
    const lastDash = windowTitle.lastIndexOf(" - ");
    if (lastDash !== -1) {
        return windowTitle.slice(0, lastDash).trim();
    }
    return windowTitle.trim();
}
class TabReader {
    constructor() {
        this.intervalId = null;
        this.lastTitle = "";
        this.permissionOk = false;
    }
    start(onTab, onPermission, pollMs = 2000) {
        const poll = async () => {
            try {
                const win = await (0, active_win_1.default)();
                // If activeWin returns undefined, we likely lack permissions on macOS
                if (!win) {
                    if (this.permissionOk) {
                        this.permissionOk = false;
                        onPermission(false);
                    }
                    return;
                }
                if (!this.permissionOk) {
                    this.permissionOk = true;
                    onPermission(true);
                }
                const browser = detectBrowser(win.owner.name);
                if (!browser)
                    return;
                const tabTitle = extractTabTitle(win.title);
                if (!tabTitle || tabTitle === this.lastTitle)
                    return;
                this.lastTitle = tabTitle;
                onTab({ timestamp: Date.now(), browser, tabTitle });
            }
            catch {
                // Silently swallow — permissions may not be granted yet
                if (this.permissionOk) {
                    this.permissionOk = false;
                    onPermission(false);
                }
            }
        };
        // Run once immediately so the UI gets a quick first result
        void poll();
        this.intervalId = setInterval(() => void poll(), pollMs);
    }
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
exports.TabReader = TabReader;
//# sourceMappingURL=tabReader.js.map