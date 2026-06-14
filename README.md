# Shanti

A cross-platform desktop wellness app that monitors computer activity via AI to detect stress, triggers guided breathing exercises, and sends scheduled check-in emails. *Shanti* (शांति) means "peace."

## Features

- **Stress Detection** — background monitor tracks window switches, idle time, typing patterns — analyzed by our algorithim every 30 seconds
- **Guided Breathing** — full-screen breathing exercise (4s inhale / 2s hold / 6s exhale, 4 cycles) triggered by stress or manually (resend api)
- **Scheduled Check-ins** — set email frequency (hourly / daily / weekly / monthly / yearly) — Resend sends wellness reminders automatically
- **Desktop App** — runs in system tray, launches at startup, live tray icon changes color with stress level
- **Dual Theme** — cinematic dark mode + Air light mode

## Download

Run the command for windows or mac on the website (linux support comming soon)

## Web Dashboard

The web version is live at **https://mh3-project.vercel.app** — log in to view your stress history, manage email schedule, and track wellness trends.

Devpost at **https://devpost.com/software/shanti-uqrlty**

## Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lenis Scroll
- **Desktop:** Electron with auto-update (electron-updater)
- **Backend:** Convex (real-time Postgres DB + Auth)
- **Auth:** Better Auth
- **Email:** Resend
- **AI:** Custom Algorithim

## Dev Commands

```
npm run dev             # Start Vite dev server (web)
npm run dev:electron    # Start Electron app in dev mode
npm run build           # Build web + Electron TypeScript
npm run pack            # Package for current platform (dev)
npm run dist            # Build distributable installers
```

## Privacy

Activity monitoring stays entirely on your machine. The only external calls are:
1. **Email check-ins** — sent via Resend at your configured frequency
2. **Supabase sync** — authentication and schedule preferences
