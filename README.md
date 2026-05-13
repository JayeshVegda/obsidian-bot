# Vault Bot v2.0

A **MERN-stack** rewrite of the Obsidian knowledge pipeline — paste AI-generated JSON → validates → saves `.md` to your vault → updates the GitHub index.

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS v3 + Radix UI |
| **State** | Zustand (auth) + TanStack Query v5 |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Backend** | Node.js + Express 5 + TypeScript |
| **Config** | Zod-validated env + YAML config |
| **Logging** | Winston + daily rotating files |

## Project Structure

```
vault-bot/
├── .env.example          ← copy to .env and fill in
├── .env                  ← your secrets (gitignored)
├── config.yaml           ← vault behavior config
├── package.json          ← npm workspaces root
├── scripts/
│   ├── setup.mjs         ← local development setup
│   └── vps-setup.sh      ← production VPS setup
├── logs/                 ← auto-created, rotating log files
│
├── server/               ← Express API (Node.js)
│   ├── src/
│   │   ├── index.ts      ← app entry, middleware, routing
│   │   ├── env.ts        ← Zod-validated environment
│   │   ├── middleware/
│   │   │   └── auth.ts   ← X-API-Key guard
│   │   ├── routes/
│   │   │   ├── notes.ts  ← POST /api/notes
│   │   │   ├── status.ts ← GET  /api/status
│   │   │   ├── photos.ts ← attachment upload, list, delete, serve
│   │   │   ├── index.ts  ← reindex + retry-push
│   │   │   └── config.ts ← GET /api/config, /test-key
│   │   ├── services/
│   │   │   ├── validator.ts  ← 3-layer Zod + business rules
│   │   │   ├── writer.ts     ← JSON → .md with YAML frontmatter
│   │   │   ├── indexer.ts    ← vault-index.json + git push
│   │   │   ├── photoHandler.ts ← attachment upload, serve, delete
│   │   │   └── state.ts      ← bot_state.json, retry_state.json
│   │   └── utils/
│   │       ├── config.ts     ← config.yaml loader + Zod schema
│   │       └── logger.ts     ← Winston logger
│   └── tsconfig.json
│
└── client/               ← React SPA
    ├── src/
    │   ├── main.tsx       ← React entry + QueryClient
    │   ├── App.tsx        ← Router + auth guard
    │   ├── index.css      ← Tailwind + design tokens
    │   ├── lib/
    │   │   ├── api.ts     ← Axios client + typed API functions
    │   │   └── utils.ts   ← cn(), formatDate(), helpers
    │   ├── store/
    │   │   └── auth.ts    ← Zustand persisted auth store
    │   ├── hooks/
    │   │   └── useVault.ts ← TanStack Query hooks
    │   └── components/
    │       ├── layout/
    │       │   └── Layout.tsx      ← sidebar nav
    │       ├── pages/
    │       │   ├── LoginPage.tsx
    │       │   ├── DashboardPage.tsx ← stats + charts
    │       │   ├── SaveNotePage.tsx  ← form + JSON import
    │       │   ├── PhotosPage.tsx
    │       │   └── SettingsPage.tsx
    │       └── ui/
    │           └── Toaster.tsx      ← toast notification system
    └── vite.config.ts    ← dev proxy → server:4000
```

## Quick Start

### 1. Clone & setup

```bash
git clone <your-repo>
cd vault-bot
node scripts/setup.mjs
```

### 2. Configure

```bash
nano .env          # fill in all values (see .env.example)
nano config.yaml   # adjust vault behavior if needed
```

### 3. Run in development

```bash
npm run dev
# Server:  http://localhost:4000
# Client:  http://localhost:5173  (auto-proxies /api → server)
```

### 4. Open the app

Go to `http://localhost:5173` and sign in with your `API_SECRET_KEY`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_DOMAIN` | — | Deployment domain used by the VPS setup script |
| `API_SECRET_KEY` | ✅ | Min 16-char secret; used as `X-API-Key` header |
| `VAULT_PATH` | ✅ | Absolute path to your Obsidian vault |
| `VAULT_INDEX_PATH` | ✅ | Local path or remote URL to `vault-index.json` |
| `GITHUB_REPO_PATH` | ✅ | Local path to the git repo for pushing the index |
| `VAULT_INDEX_GITHUB_URL` | — | Public raw URL for your vault index |
| `PORT` | — | API server port (default: `4000`) |
| `HOST` | — | Server bind address (default: `0.0.0.0`) |
| `BODY_LIMIT` | — | JSON request body limit for uploads (default: `35mb`) |
| `CORS_ORIGINS` | — | Comma-separated origins (default: `http://localhost:5173`) |
| `LOG_LEVEL` | — | `error`/`warn`/`info`/`debug` (default: `info`) |
| `NODE_ENV` | — | `development`/`production` (default: `development`) |

---

## API Reference

All routes returning data require `X-API-Key: <your-key>` header, except `GET /api/config` and `GET /api/health`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/config` | — | Note types, PARA folders, version |
| `GET` | `/api/settings` | ✅ | Runtime path and sync checks |
| `GET` | `/api/test-key` | ✅ | Validate API key |
| `POST` | `/api/notes` | ✅ | Save a note to the vault |
| `GET` | `/api/status` | ✅ | Vault stats, recent notes, push state |
| `POST` | `/api/index/reindex` | ✅ | Full vault reindex |
| `POST` | `/api/index/retry-push` | ✅ | Retry failed git push |
| `GET` | `/api/photos` | ✅ | List recent attachments |
| `POST` | `/api/photos/upload` | ✅ | Upload attachment (base64) |
| `DELETE` | `/api/photos` | ✅ | Delete an attachment |
| `GET` | `/api/photos/file/:path` | — | Serve an attachment |

### POST /api/notes — payload

```json
{
  "title": "string",
  "tags": ["string"],
  "backlinks": ["string"],
  "note_type": "idea|fleeting|reference|task|log|meeting|book|person|code|business|moc|other",
  "para_suggestion": "00_Inbox",
  "created_date": "2026-05-10",
  "content": "Markdown string (min 20 words)",
  "photos": ["optional/relative/path.jpg"]
}
```

---

## VPS Deployment

For a VPS, use the guided setup script. It asks for your domain, vault path, vault-index repo/path, Git identity, raw index URL, installs/builds the app, writes systemd and nginx config, and can run certbot for HTTPS.

```bash
bash scripts/vps-setup.sh
```

The default domain prompt is `note.zayu.dev`, but it is only a default. You can enter any domain. You can also override it non-interactively:

```bash
VAULT_BOT_DOMAIN=note.zayu.dev bash scripts/vps-setup.sh
```

The script sets production-safe defaults:

- `NODE_ENV=production`
- `HOST=127.0.0.1`
- `CORS_ORIGINS=https://<your-domain>`
- `BODY_LIMIT=35mb`
- systemd service: `vault-bot`
- nginx reverse proxy to the local Node server
- attachment upload body size: `40M` at nginx

After setup, open the Settings page in the app. It checks whether your project path, vault path, attachments folder, vault index path, and GitHub index repo are correct.

### Manual Build

```bash
npm run build
npm start
```

This compiles TypeScript for the server (`server/dist/`) and bundles the frontend (`client/dist/`). The Express server serves the built React app automatically in production.

### Useful VPS Commands

```bash
sudo systemctl status vault-bot
journalctl -u vault-bot -f
sudo systemctl restart vault-bot
sudo nginx -t
sudo systemctl reload nginx
```

---

## Tasker (Android) Integration

Same as v1 — point your HTTP request at the new server:

1. Variable Set: `%note_json = %CLIP`
2. HTTP Request `POST http://YOUR_SERVER/api/notes`
   - Header: `X-API-Key:YOUR_KEY`
   - Header: `Content-Type:application/json`
   - Body: `%note_json`
3. Flash `%http_data`

---

## Troubleshooting

```bash
# Live logs
journalctl -u vault-bot -f

# App logs
tail -f logs/vault-bot-$(date +%Y-%m-%d).log

# Test API key
curl -H "X-API-Key: YOUR_KEY" http://localhost:4000/api/test-key

# Check health
curl http://localhost:4000/api/health
```
