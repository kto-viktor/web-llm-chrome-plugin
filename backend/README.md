# Online backend

The extension's online mode talks to this backend. It's **OpenWebUI** (RAG,
web search, inference via OpenRouter) behind a **thin zero-dependency Node
adapter** that implements the extension contract ([../docs/backend-api.md](../docs/backend-api.md))
and adds the invisible anti-abuse layer.

```
browser ──TLS──▶ caddy ──▶ adapter ──▶ openwebui ──▶ OpenRouter ──▶ LLM
                          (contract,     (RAG, web
                           auth, rate     search,
                           limit)         memory)
```

Why the adapter exists (vs. hitting OpenWebUI directly):

- OpenWebUI's `/api/models` has no `featured` / `default` flags the picker needs.
- We want **no user-facing auth**: the adapter holds OpenWebUI's service-account
  key and checks a single shared `Authorization: Bearer` secret + per-IP rate
  limit instead of per-user login.

## What the adapter does / doesn't

| Endpoint | Behavior |
|----------|----------|
| `GET /api/models` | Served from `adapter/config.js` (`featured`/`default`). Override via `MODELS_JSON`. |
| `POST /api/chat/completions` | Proxied to OpenWebUI (SSE passthrough), service-account auth injected. |
| `POST /api/v1/files/` | Proxied to OpenWebUI (multipart) → RAG over the page. |
| `GET /healthz` | Unauthenticated health check. |

- **RAG, web search** — handled by OpenWebUI.
- **Per-user long-term memory** — *not wired yet.* `X-User-Id` is forwarded but
  OpenWebUI scopes Memories per account; mapping per-install ids needs more work.
  Tracked as a follow-up (see ../docs/TODO.md).

## Deploy (any Docker host / VPS)

Two-phase, because you need OpenWebUI running once to mint its API key.

**1. DNS + env.** Point `chat.example.com` at the host. Then:

```bash
cd backend
cp .env.example .env
# Fill DOMAIN, OPENROUTER_API_KEY, BACKEND_API_KEY (openssl rand -hex 24).
# Leave OPENWEBUI_API_KEY blank for now.
```

**2. First boot — create the OpenWebUI service key.**

```bash
docker compose up -d openwebui
# Open https://<DOMAIN>, create the first admin account, then:
#   Settings → Account → enable "API Keys" (off by default), then create one.
```

Put that key in `.env` as `OPENWEBUI_API_KEY`. (If you can't enable API keys,
the admin login JWT works too but expires in ~28 days — an API key doesn't.)

**3. Connect OpenRouter** (in the OpenWebUI admin UI):
Settings → Connections → OpenAI API → Base URL `https://openrouter.ai/api/v1`,
key = your OpenRouter key. (Also pre-set via `OPENAI_API_BASE_URL`/`OPENAI_API_KEY`
in compose.) Confirm the models in `adapter/config.js` exist in OpenRouter's
catalog — adjust ids if needed.

**4. Bring everything up:**

```bash
docker compose up -d --build
curl https://<DOMAIN>/healthz                       # {"ok":true}
curl -H "Authorization: Bearer $BACKEND_API_KEY" \
     https://<DOMAIN>/api/models                     # {"data":[...]}
```

**5. Build the extension against it:**

```bash
BACKEND_URL=https://<DOMAIN> BACKEND_API_KEY=<same as .env> npm run build
```

### Managed platforms (Railway / Fly / Render)

The adapter is a plain Docker image (`adapter/Dockerfile`) — deploy it as one
service and OpenWebUI's official image as another, set the same env vars, and
let the platform terminate TLS (drop the Caddy service; point `OPENWEBUI_URL`
at the internal OpenWebUI address). Tell me the platform and I'll add its config.

## Local dev

For UI work you usually don't need this stack — `npm run mock-backend` (repo
root) fakes the same contract. Use this real backend to validate actual RAG /
streaming / model routing.

```bash
# adapter alone, pointed at a local OpenWebUI, no auth:
OPENWEBUI_URL=http://localhost:3000 node backend/adapter/server.js
```
