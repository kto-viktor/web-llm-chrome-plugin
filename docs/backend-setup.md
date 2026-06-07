# Backend setup (OpenWebUI)

> **Deploying for real?** See [`../backend/README.md`](../backend/README.md) — it
> ships a ready docker-compose (OpenWebUI + a thin adapter + Caddy/TLS) wired to
> OpenRouter, which is the supported path. This file is the conceptual reference.

The online mode of the extension talks to a self-hosted OpenAI-compatible backend.
The reference implementation is **OpenWebUI** — it bundles RAG (Documents),
long-term memory (Memories) and Tools (incl. Web Search) out of the box, and exposes
an OpenAI-compatible `/api/chat/completions` endpoint with SSE streaming.

Any backend that implements the contract in [backend-api.md](./backend-api.md) is a
drop-in replacement.

## Quick start (Docker)

```bash
docker run -d \
  --name openwebui \
  -p 3000:8080 \
  -v openwebui:/app/backend/data \
  ghcr.io/open-webui/open-webui:main
```

UI lives at `http://localhost:3000`. Create the first admin account, then:

1. **Settings → Connections** — point OpenWebUI at one or more LLM providers
   (OpenAI, Anthropic via proxy, Ollama, vLLM, …).
2. **Settings → Documents** — set chunking + embedding model. Default
   (`sentence-transformers/all-MiniLM-L6-v2`) is fine for page-RAG.
3. **Settings → Memory** — enable Memories. Optional: connect mem0.
4. **Settings → Web Search** — enable a provider (DuckDuckGo works without keys;
   SearXNG / Tavily / Brave for higher quality).
5. **Settings → Tools** — enable / install tools the assistant can call.

## Wiring the extension

`BACKEND_URL` is inlined at build time. Set it before `npm run build`:

```bash
BACKEND_URL=http://localhost:3000 npm run build
```

For production, set it to a real URL reachable from users' browsers, e.g.
`https://chat.example.com`.

## Anti-abuse (no user-facing auth)

Users never see a login screen or paste a key. Two layers protect against
casual abuse:

1. **Build-time shared secret.** Set `BACKEND_API_KEY` when building the
   extension; it's inlined into the bundle and sent as `Authorization: Bearer
   <key>` on every request. Configure the backend to reject requests without
   it. The secret is technically extractable from the bundle, so this stops
   drive-by traffic but isn't real security.

   ```bash
   BACKEND_URL=https://chat.example.com \
     BACKEND_API_KEY=sk-xxx \
     npm run build
   ```

2. **IP rate limiting.** This is the real protection. Configure at the reverse
   proxy (nginx / Caddy / Cloudflare) or in OpenWebUI. Recommended: 60 req/min
   per IP for `/api/chat/completions`.

## Verifying the backend

```bash
curl -H "Authorization: Bearer $BACKEND_API_KEY" \
     http://localhost:3000/api/models
# expect: { "data": [ { "id": "...", "name": "...", "default": true, ... } ] }

curl -N -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BACKEND_API_KEY" \
  -d '{"model":"<id from /api/models>","messages":[{"role":"user","content":"hi"}],"stream":true}'
# expect: SSE stream of chat.completion.chunk events terminating with [DONE]
```

If both work, the extension's online mode will work too.
