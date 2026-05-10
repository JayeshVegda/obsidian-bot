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
├── prompts.yaml          ← AI prompt templates per note type
├── package.json          ← npm workspaces root
├── scripts/
│   └── setup.mjs         ← first-time setup script
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
│   │   │   ├── photos.ts ← photo CRUD + serving
│   │   │   ├── index.ts  ← reindex + retry-push
│   │   │   └── config.ts ← GET /api/config, /prompts, /test-key
│   │   ├── services/
│   │   │   ├── validator.ts  ← 3-layer Zod + business rules
│   │   │   ├── writer.ts     ← JSON → .md with YAML frontmatter
│   │   │   ├── indexer.ts    ← vault-index.json + git push
│   │   │   ├── photoHandler.ts ← base64 upload, serve, delete
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
    │       │   ├── PromptsPage.tsx
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
nano prompts.yaml  # customize AI prompts
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
| `API_SECRET_KEY` | ✅ | Min 16-char secret; used as `X-API-Key` header |
| `VAULT_PATH` | ✅ | Absolute path to your Obsidian vault |
| `VAULT_INDEX_PATH` | ✅ | Local path or remote URL to `vault-index.json` |
| `GITHUB_REPO_PATH` | ✅ | Local path to the git repo for pushing the index |
| `VAULT_INDEX_GITHUB_URL` | — | Public raw URL; injected into AI prompts |
| `PORT` | — | API server port (default: `4000`) |
| `HOST` | — | Server bind address (default: `0.0.0.0`) |
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
| `GET` | `/api/test-key` | ✅ | Validate API key |
| `POST` | `/api/notes` | ✅ | Save a note to the vault |
| `GET` | `/api/status` | ✅ | Vault stats, recent notes, push state |
| `GET` | `/api/prompts` | ✅ | AI prompt templates |
| `POST` | `/api/index/reindex` | ✅ | Full vault reindex |
| `POST` | `/api/index/retry-push` | ✅ | Retry failed git push |
| `GET` | `/api/photos` | ✅ | List recent photos |
| `POST` | `/api/photos/upload` | ✅ | Upload photo (base64) |
| `DELETE` | `/api/photos` | ✅ | Delete a photo |
| `GET` | `/api/photos/file/:path` | — | Serve a photo |

### POST /api/notes — payload

```json
{
  "title": "string",
  "tags": ["string"],
  "backlinks": ["string"],
  "note_type": "idea|reference|book|meeting|task|log|code|person",
  "para_suggestion": "00_Inbox",
  "created_date": "2026-05-10",
  "content": "Markdown string (min 20 words)",
  "photos": ["optional/relative/path.jpg"]
}
```

---

## Production Deployment

### Build

```bash
npm run build
```

This compiles TypeScript for the server (`server/dist/`) and bundles the frontend (`client/dist/`).

The Express server serves the built React app automatically in production.

### Systemd service

```bash
# Edit vault-bot.service → replace YOUR_USERNAME
sudo cp vault-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vault-bot
sudo systemctl status vault-bot
```

### Nginx (optional reverse proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 25M;
    }
}
```

### Environment in production

Set `NODE_ENV=production` and `CORS_ORIGINS=https://yourdomain.com` in `.env`.

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
