import activeWin from "active-win";

export interface TabSnapshot {
  timestamp: number;
  browser: "chrome" | "firefox" | "safari" | "edge" | "other";
  tabTitle: string;
}

type BrowserName = TabSnapshot["browser"];

const BROWSER_MAP: Record<string, BrowserName> = {
  "google chrome": "chrome",
  "chrome": "chrome",
  "chromium": "chrome",
  "firefox": "firefox",
  "mozilla firefox": "firefox",
  "safari": "safari",
  "microsoft edge": "edge",
  "msedge": "edge",
};

function detectBrowser(ownerName: string): BrowserName | null {
  const lower = ownerName.toLowerCase();
  for (const [key, value] of Object.entries(BROWSER_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function extractTabTitle(windowTitle: string): string {
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

export type TabUpdateCallback = (snapshot: TabSnapshot) => void;
export type PermissionCallback = (ok: boolean) => void;

export class TabReader {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTitle = "";
  private permissionOk = false;

  start(onTab: TabUpdateCallback, onPermission: PermissionCallback, pollMs = 2000): void {
    const poll = async (): Promise<void> => {
      try {
        const win = await activeWin();

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
        if (!browser) return;

        const tabTitle = extractTabTitle(win.title);
        if (!tabTitle || tabTitle === this.lastTitle) return;
        this.lastTitle = tabTitle;

        onTab({ timestamp: Date.now(), browser, tabTitle });
      } catch {
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

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
