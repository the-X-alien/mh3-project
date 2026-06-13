import { execFile } from "child_process";

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
  // Browsers suffix their name, sometimes with a profile name:
  //   "Tab - Google Chrome"
  //   "Tab - Google Chrome - ProfileName"
  const patterns: RegExp[] = [
    /(?: - Google Chrome(?: - .+)?)$/,
    /(?: — Mozilla Firefox(?: - .+)?)$/,
    /(?: - Mozilla Firefox(?: - .+)?)$/,
    /(?: - Safari(?: - .+)?)$/,
    /(?: - Microsoft Edge(?: - .+)?)$/,
  ];

  let result = windowTitle.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of patterns) {
      const match = result.match(pattern);
      if (match) {
        result = result.slice(0, -match[0].length).trim();
        changed = true;
        break;
      }
    }
  }

  if (result !== windowTitle.trim()) return result;

  // Generic fallback: strip last " - Anything"
  const lastDash = result.lastIndexOf(" - ");
  if (lastDash !== -1) {
    return result.slice(0, lastDash).trim();
  }
  return result;
}

function getActiveWindow(): Promise<{ owner: string; title: string } | null> {
  const script = `
tell application "System Events"
  set frontProcess to first application process whose frontmost is true
  set appName to name of frontProcess
  try
    set winTitle to title of first window of frontProcess
  on error
    set winTitle to ""
  end try
end tell
return appName & "|||" & winTitle
`;
  return new Promise((resolve) => {
    execFile("/usr/bin/osascript", ["-e", script], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve(null);
        return;
      }
      const parts = stdout.trim().split("|||");
      if (parts.length !== 2) {
        resolve(null);
        return;
      }
      resolve({ owner: parts[0], title: parts[1] });
    });
  });
}

export type TabUpdateCallback = (snapshot: TabSnapshot) => void;
export type PermissionCallback = (ok: boolean) => void;
export type ActivityCallback = () => void;

export class TabReader {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTitle = "";
  private permissionOk = false;

  start(onTab: TabUpdateCallback, onPermission: PermissionCallback, onActivity: ActivityCallback, pollMs = 2000): void {
    const poll = async (): Promise<void> => {
      try {
        const win = await getActiveWindow();

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

        if (!win.title) return;

        const browser = detectBrowser(win.owner);
        if (!browser) return;

        // Let listeners know a browser tab is active (even if unchanged)
        onActivity();

        const tabTitle = extractTabTitle(win.title);
        if (!tabTitle || tabTitle === this.lastTitle) return;
        this.lastTitle = tabTitle;

        onTab({ timestamp: Date.now(), browser, tabTitle });
      } catch {
        if (this.permissionOk) {
          this.permissionOk = false;
          onPermission(false);
        }
      }
    };

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
