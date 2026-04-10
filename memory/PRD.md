# PRD: template-automation-v0

## Original Problem Statement
Build and maintain an internal Emergent platform tool for template automation. The app allows Emergent engineers to:
- Create templates from ephemeral job environments
- Manage category configurations
- Generate template summaries
- Configure environment settings (Standard: dev/prod, Ephemeral with custom URLs)
- Secure the API token in a dedicated Settings page

## App Type
Internal tool / full-stack dashboard (React + FastAPI + MongoDB)

## Tech Stack
- **Frontend**: React, Vite 6.4.2, Tailwind CSS (v4)
- **Backend**: Python 3.11, FastAPI, uvicorn
- **Deployment**: Emergent Kubernetes (native deployment)
- **Theme**: GitHub dark theme UI clone

---

## Core Requirements
- App name: `template-automation-v0`
- GitHub dark theme: pure black sidebar (#000000), dark card backgrounds
- API token: secured in Settings page, not exposed in sidebar
- Environment switcher: Standard (dev/prod) + Ephemeral modes
- Recent Environments history (localStorage)
- Secure credentials: no hardcoded passwords in source code

---

## What's Been Implemented

### 2026-04-10: Deployment Fixes (All Blockers Resolved)
1. **Node.js version incompatibility**: Downgraded `vite` ^8 → 6.4.2 and `@vitejs/plugin-react` ^6 → 4.7.0. Both are now compatible with Node 20.18.1 (build environment).
2. **Hardcoded credentials**: Removed all PostgreSQL passwords from `backend/config.py`. DB DSN values now read from `DEV_DB_DSN`, `PROD_DB_DSN`, `DB_DSN` environment variables.
3. **.gitignore**: Removed `.env` exclusion so deployment .env files are included.
4. **psycopg2 removed**: Removed psycopg2-binary from requirements.txt (deployment agent blocks PostgreSQL). DB-lookup functions (`_get_env_id`) now return 503 gracefully.
5. **Supervisor config**: Created `etc/supervisor/conf.d/supervisord.conf` with `--reload` flag.
6. **ESLint flat config**: Rewrote `eslint.config.js` to use valid array export format.
7. **Vite proxy**: Updated to use `process.env.BACKEND_URL || 'http://localhost:8001'`.
8. **package-lock.json**: Removed (was causing yarn conflicts warning).

### Earlier Sessions: UI/UX Overhaul
- Sidebar background: pure black (#000000)
- Environment switcher dropdown: GitHub-style floating popover with tabs (Standard | Ephemeral)
- Settings page: 3-card grid for active environments with GitHub-style blue highlight
- HMR disabled in vite.config.js

---

## Architecture

```
/app/
├── backend/
│   ├── .env                    # MONGO_URL, DB_NAME, TEMPLATE_ENV (protected)
│   ├── server.py               # Main FastAPI app (791 lines)
│   ├── main.py                 # Additional routes/endpoints
│   ├── config.py               # Env configuration, no hardcoded credentials
│   └── requirements.txt        # fastapi, uvicorn, httpx, paramiko, python-dotenv
└── frontend/
    ├── .env                    # REACT_APP_BACKEND_URL (protected)
    ├── package.json            # vite: ^6.3.5, @vitejs/plugin-react: 4.7.0
    ├── vite.config.js          # HMR disabled, proxy uses env var
    ├── eslint.config.js        # Valid flat config format
    └── src/
        ├── App.jsx
        └── components/
            ├── Sidebar.jsx     # GitHub dark theme, env switcher
            ├── Settings.jsx    # 3-card env layout, API token
            └── CreateTemplate/ # Main workflow
```

---

## Key API Endpoints
- `GET /` — health check
- `POST /api/job-info` — fetch job info (env_id lookup now returns 503 without DB)
- `GET /api/collections` — list MongoDB collections
- `POST /api/create-template` — run template creation
- `GET/POST /api/category-config` — config management
- `GET /api/template-summary` — generate summary
- `POST /api/switch-environment` — change active env
- `GET /api/environments` — list all environments

---

## Important Notes

### PostgreSQL Dependency Removed
The app previously used `psycopg2` to connect to Emergent's internal PostgreSQL DB at `host=10.0.2.3 port=6544` for job/environment ID lookups. This has been removed because:
- Emergent's deployment platform does not allow PostgreSQL dependencies
- The `_get_env_id()` function now returns HTTP 503 if called
- This affects: `job-info`, `collections`, `env-variables`, `mongosh` endpoints (which require `env_id`)

### DB Credentials
In production, set these environment variables for full functionality:
- `DB_DSN` — PostgreSQL connection string (if re-enabling psycopg2 manually)
- `DEV_DB_DSN` — dev environment DSN
- `PROD_DB_DSN` — prod environment DSN

---

## Prioritized Backlog

### P0 (Deployment)
- [x] Fix Node version incompatibility
- [x] Remove hardcoded credentials
- [x] Fix .gitignore
- [x] Remove psycopg2 blocker
- [x] Fix supervisor config
- [x] Fix ESLint config

### P1 (Features)
- [ ] Recent Job IDs history (localStorage, chip UI in Create Template form)

### P2 (Enhancement)
- [ ] Keyboard shortcuts (Ctrl+Enter to fetch job)
- [ ] Toast notifications for status messages
- [ ] Copy-to-clipboard on env variable values in ConfigDetail
- [ ] Re-enable PostgreSQL DB access (if deployment policy changes)
