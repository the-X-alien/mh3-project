# Mental Tachometer

A real-time cognitive load monitor that tracks browsing patterns to detect and prevent burnout. Available as a browser extension (Chrome + Firefox) and a live web dashboard.

## Browser Extension (Primary)

Monitors you throughout the day — tab switches, idle time, keystroke patterns — and computes a live Cognitive Load Index (CLI). When CLI exceeds 75%, triggers an overload overlay with a guided breathing decompression exercise.

### How to Install

**Chrome:**
1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder in this project

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`

### What It Monitors

- **Tab switches** — counts how often you switch context (background tab tracking)
- **Delete spikes** — monitors Backspace/Delete keystroke ratio via content script
- **Idle time** — detects micro-stuttering via `chrome.idle` API
- **CLI formula** — `(Task Complexity × Work Hours) / Sleep Hours` + telemetry penalties

### Features

| Feature | Description |
|---------|-------------|
| Popup dashboard | Real-time CLI gauge, telemetry stats, check-in button |
| Fault code display | Shows diagnostic codes when overloaded |
| Overload overlay | Full-screen breathing exercise with timer |
| Trusted contact | Privacy-preserving nudge (red/yellow/green only) |
| Daily check-in | Logs once per day; sends nudge if CLI is red |
| Resend email nudge | Optional email to trusted contact via Vercel API |
| CLI formula sliders | Adjust base formula in popup settings |

### Privacy

All data stays on your machine. The only external call is an optional email nudge (no CLI scores, no raw data — just a red/yellow/green signal).

## Web Dashboard

The full React dashboard is deployed at **https://mh3-project.vercel.app** with:
- Split-screen telemetry engine + task sandbox
- 3D Three.js ambient sphere reflecting CLI
- Chart.js CLI gauge
- Framer Motion animations

### Dev Commands

```
npm run dev          # Start Vite dev server
npm run build        # Build web dashboard
npm run preview      # Preview production build
npm run extension:pack  # Package extension as ZIP
```

## Stack

- **Extension:** Vanilla JS, Chrome/Firefox MV3 APIs
- **Dashboard:** React 18, Vite, TypeScript, Tailwind CSS
- **Email:** Resend SDK via Vercel Function
- **3D:** Three.js / @react-three/fiber
