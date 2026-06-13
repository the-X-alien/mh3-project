# Shanti Project — Handoff Context

## Current State

The project is at `C:\Users\dave\IdeaProjects\mh3-project`. The backend has been switched from Convex to Supabase, the frontend is deployed to Vercel at `https://mh3-project.vercel.app`, and a stripped-down Electron desktop app with browser tab tracking is built and ready in `release\win-unpacked\Shanti.exe`.

### What's Working

- **Web app on Vercel**: auth (email/password + GitHub OAuth), dashboard with breathing exercises, stress monitor, email schedule settings, tab viewer (Electron-only).
- **Supabase project**: `abiizncmbcgqodkvnucg` — schema tables applied (email_schedules, nudges, trusted_contacts, telemetry_events, cli_snapshots, daily_aggregates) with RLS policies. GitHub OAuth provider configured in Supabase Dashboard.
- **Electron desktop app** (tab-tracker-only build): Self-contained app at `release\win-unpacked\Shanti.exe`. Runs as a tray app, tracks browser tabs (Chrome/Firefox/Safari/Edge/Brave/Opera) on Windows via PowerShell/Windows API, shows tab history with per-site breakdown donut chart, rapid switch detection with notifications.
- **Tab reader**: Cross-platform (`electron/tabReader.ts`) — macOS osascript, Windows PowerShell P/Invoke, Linux xdotool.

### Architecture

```
mh3-project/
├── electron/                    # Desktop app (Electron)
│   ├── main.ts                  # Main process (tray, window, tab reader, IPC)
│   ├── preload.ts               # contextBridge API ("tabDashboard")
│   ├── tabReader.ts             # Cross-platform browser tab reader
│   ├── monitor.ts               # [OBSOLETE] AI stress monitor — keep for later
│   └── renderer/                # Standalone desktop UI
│       ├── index.html
│       ├── app.js               # Vanilla JS renderer
│       └── styles.css           # Shanti dark/amber theme
├── src/                         # Web app (React + Vite)
│   ├── components/
│   │   ├── App.tsx              # Routes (/, /sign-in, /dashboard)
│   │   ├── SignIn.tsx           # Auth page (email/password + GitHub OAuth)
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── TabViewer.tsx        # React tab viewer (Electron-only)
│   │   ├── BreathingExercise.tsx
│   │   ├── ScheduleSettings.tsx
│   │   ├── AiInsights.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── Landing.tsx          # Marketing page with install commands
│   │   └── AuthProvider.tsx     # Supabase auth context
│   └── lib/supabase.ts
├── supabase/schema.sql          # Database schema
├── public/
│   ├── install.ps1              # Windows installer script
│   └── install.sh               # macOS/Linux installer script
├── package.json                 # Build scripts for web + electron
├── dist-electron/               # Built Electron output (gitignored)
└── release/                     # Packaged installers (gitignored)
    └── win-unpacked/Shanti.exe  # Portable Windows build
```

## Remaining Work (Priority Order)

### 1. Fix the Install Scripts

**Problem**: `public/install.ps1` and `public/install.sh` try to download the installer from GitHub Releases API (`https://api.github.com/repos/the-X-alien/mh3-project/releases/latest`), but no release has been published. The scripts need a fallback or need to be rewritten.

**Fix**: Since the only URL is `https://mh3-project.vercel.app/`, the install scripts should either:
- Build from source (git clone + npm install + npm run dist) — works immediately
- Or serve installer files from Vercel's `public/` directory

The Vercel site serves static files from `public/`. So we could put the NSIS installer at `public/Shanti-Setup.exe` and have the scripts download from `https://mh3-project.vercel.app/Shanti-Setup.exe`. But the installer (~29MB 7z) might be too large for Vercel's free tier. Building from source in the install script is more practical.

**Install script approach**:
- Windows (install.ps1): Check if GitHub release exists; if not, clone repo and run `npm run dist`, then launch the installer.
- macOS/Linux (install.sh): Same approach — fall back to building from source.

### 2. Complete the NSIS Installer Build

**Problem**: `npm run dist` ran but only produced `release/shanti-1.0.0-x64.nsis.7z` and `release/win-unpacked/` — the actual `.exe` installer wasn't generated (likely needs code signing or NSIS config fix).

**Fix**: Check electron-builder NSIS config in `package.json`. The `"nsis"` section has `oneClick: false` and `allowToChangeInstallationDirectory: true`. Might need to add `"installerIcon"` or fix the build environment. Run `npx electron-builder --win nsis` to debug.

### 3. Publish a GitHub Release

After the installer is built, create a GitHub Release with the installer attached:
1. Build the app: `npm run dist`
2. Create a GitHub Release: `gh release create v1.0.0 --title "Shanti v1.0.0" --notes "First release" release/*.exe release/*.7z`
3. The install scripts will then find the release and download the installer.

### 4. Fix the Web App Dashboard

**Issues reported**: "the app doesnt work" — needs investigation:
- Check Vercel deployment logs: `npx vercel logs mh3-project`
- Check if the Supabase connection is working (auth, DB queries)
- The Dashboard.tsx has references to `electron-updater` and `electronAPI` — these are Electron-only and might cause browser console errors if not guarded properly
- The AiInsights component might be crashing in browser (it has Electron-specific code with no null check guard)

### 5. Re-integrate the AI Stress Monitor (Future)

`electron/monitor.ts` has been stripped out for the first release. When ready to add it back:
- It polls active window + idle time every 2 seconds
- Every 30 seconds sends the activity log to Hack Club AI or OpenRouter for stress analysis
- Returns stress score (0-100) with label (calm/tense/stressed)
- Should be re-integrated into `electron/main.ts` as a separate module alongside the tab reader

### 6. Complete the Web → Desktop Sync (Future)

The web dashboard (Vite/React) and the desktop tab tracker (standalone Electron) are currently separate. Future work should:
- Have the desktop app also load the React dashboard for the full UI (breathing exercises, schedule settings)
- Sync tab data to Supabase (`telemetry_events` table)
- Load the Vite-built `dist/index.html` in Electron when available, fall back to the standalone renderer

## Key Files Reference

| File | Purpose |
|---|---|
| `electron/main.ts` | Electron main process — tray, window, tab reader init |
| `electron/preload.ts` | contextBridge exposing `tabDashboard` API |
| `electron/tabReader.ts` | Cross-platform tab reader (Windows/macOS/Linux) |
| `electron/renderer/app.js` | Vanilla JS renderer — tab list, donut chart |
| `src/components/SignIn.tsx` | Auth page with GitHub OAuth button |
| `src/lib/supabase.ts` | Supabase client init |
| `supabase/schema.sql` | Database schema (6 tables + RLS) |
| `public/install.ps1` | Windows install script (needs fix) |
| `public/install.sh` | macOS/Linux install script (needs fix) |
| `package.json` | "build:electron" compiles TS + copies renderer; "dist" packages installer |

## Build Commands

```powershell
# Compile TypeScript + copy renderer files
npm run build:electron

# Run the app (compile + copy + launch)
npm run electron:start

# Package into installer
npm run dist

# Run from the portable build directly:
.\release\win-unpacked\Shanti.exe
```

## Environment

- **Supabase project**: `abiizncmbcgqodkvnucg` (OAuth authenticated via MCP)
- **Anon key**: In `.env.local` and Vercel env vars
- **Database password**: `4aHXjXV2Hgtx7vEf` (IPv6-only host, unreachable from some networks)
- **Only URL**: `https://mh3-project.vercel.app/`
- **Supabase MCP**: Connected and working (can execute SQL, check schema, etc.)
- **Resend MCP**: Connected (for email notifications)
- **Vercel MCP**: Connected (for deployment management)
