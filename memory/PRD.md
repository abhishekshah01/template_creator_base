# Template Manager — PRD

## Problem Statement
Internal tool for Emergent platform engineers to automate template creation from ephemeral job environments. Preview, keep UI designs/frontend styles the same, fix bugs, improve UI if needed, keep layouts as-is.

## Architecture
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 (GitHub dark theme)
- **Backend**: FastAPI (Python) — `main.py` with `server.py` entry point
- **No MongoDB**: Uses external PostgreSQL DB and external APIs (envcore, agent-service)
- **Proxy**: Vite dev server proxies `/api` → backend port 8001

## Core Features
- **Create Template workflow**: 4-step wizard (Identify Job → Clear DB Collections → Pause Job → Create Template)
- **Inspector Panel**: Side-by-side MongoDB document viewer + terminal
- **Category Config Management**: CRUD for category configs via external agent-service API
- **Template Summary Generator**: Calls agent-service to generate app metadata
- **Settings**: Environment switcher (dev/prod/ephemeral), API endpoint display
- **Resizable Sidebar**: Drag-to-resize with localStorage persistence

## What's Been Implemented (as of 2025-04-09)

### Bug Fixes
1. **Services not starting**: Added `server.py` entry point for uvicorn, added `start` script to `package.json`, fixed `vite.config.js` (port 3000, `allowedHosts: true`, proxy to port 8001)
2. **ProgressBar incorrect fill**: Fixed `lineFilled = step <= currentStep` → `step < currentStep` so connector after active step is not pre-filled
3. **TemplateSummary button hover**: Fixed `hover:bg-gh-accent-blue` (no feedback) → `hover:opacity-85 transition-opacity`
4. **SettingsIcon SVG corruption**: Fixed malformed `7.## 8 0Zm` → `7.898 8 0Zm` in SVG path data

### UI Improvements
- Added `data-testid` attributes to all interactive elements:
  - `nav-{page-id}` for sidebar navigation items
  - `api-token-btn`, `api-token-input`, `token-status-indicator`
  - `env-switcher-btn`
  - `fetch-job-btn`, `delete-selected-btn`, `skip-delete-btn`, `pause-job-btn`, `create-template-btn`
  - `refresh-configs-btn`, `new-config-btn`, `config-row-{id}`
  - `submit-config-btn`, `generate-summary-btn`

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- None currently

### P2 (Nice to have)
- Add keyboard shortcuts for common actions (Ctrl+Enter to fetch job)
- Add toast notifications instead of inline status bars
- Add copy-to-clipboard on env variable values in ConfigDetail

## Next Tasks
- User should test with real bearer token and actual job IDs
- Verify the create-template workflow end-to-end with a real job
