# Template Manager — PRD

## Problem Statement
Preview the existing repository UI without any changes to colors, styles, or layout.

## Architecture
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 (GitHub Dark theme)
- **Backend**: FastAPI (Python) via uvicorn on port 8001
- **DB**: PostgreSQL (remote, via psycopg2) + MongoDB (local, unused by main flows)

## What Was Done (2026-04)
- Created `/app/backend/server.py` to re-export `app` from `main.py` (supervisor expects `server:app`)
- Added `start` script to `package.json` to run `vite --host 0.0.0.0 --port 3000` (supervisor runs `yarn start`)
- Fixed Vite proxy target from port `8000` → `8001` (actual backend port per supervisor config)
- Added `allowedHosts: ['.emergentcf.dev', '.emergentagent.com', 'localhost']` to `vite.config.js` to unblock preview domain (Vite 8 host security)

## Core Features (Existing)
- **Create Template** — 4-step wizard: Identify Job → Clear DB Collections → Pause Job → Create Template
- **Category Config** — All Configs list, Create Config form, Generate Summary
- **Template Summary** — standalone tool page
- **API Token** — stored in localStorage, shown in sidebar

## Prioritized Backlog
- P0: App is running and viewable (DONE)
- P1: N/A (no changes requested beyond preview)
