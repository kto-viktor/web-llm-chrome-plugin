# Deploy to AWS (EC2 + docker-compose)

Runs the whole online backend (`backend/docker-compose.yml`: OpenWebUI + adapter
+ Caddy/TLS) on a single EC2 instance. Inference is on OpenRouter, so **no GPU**
is needed. Secrets live in `backend/.env` on the instance (chmod 600).

## 1. Launch the instance

EC2 → Launch instance:

- **AMI:** Amazon Linux 2023
- **Type:** `t3.large` (8 GB) recommended — OpenWebUI's embedding model is
  memory-hungry; `t3.medium` (4 GB) works for light use.
- **Storage:** 30 GB gp3 (Docker images + OpenWebUI data/vectors).
- **User data:** paste [`user-data.sh`](./user-data.sh) (installs Docker, clones
  the repo to `/opt/app`, seeds `backend/.env`).
- **Security group:**
  | Port | Source | Why |
  |------|--------|-----|
  | 22   | your IP only | SSH |
  | 80   | 0.0.0.0/0 | HTTP → Caddy (ACME challenge + redirect) |
  | 443  | 0.0.0.0/0 | HTTPS |

> If the GitHub repo is **private**, the user-data clone over HTTPS will fail —
> either make it public, add a deploy key, or `rsync` the code up manually.

## 2. Static IP + DNS

- Allocate an **Elastic IP** and associate it with the instance.
- In Route 53 (or your DNS): **A record** `chat.example.com → <Elastic IP>`.
- Do this **before** the next step — Caddy needs the domain resolving to get a
  Let's Encrypt cert.

## 3. Configure + start (over SSH)

```bash
ssh ec2-user@<Elastic IP>
cd /opt/app/backend
nano .env            # DOMAIN, OPENROUTER_API_KEY, BACKEND_API_KEY (openssl rand -hex 24)
```

Two-phase start (OpenWebUI's API key can only be created after first boot):

```bash
docker compose up -d openwebui
# open https://<DOMAIN> → create the admin account →
#   Settings → Account → API Keys → create one
# paste it into .env as OPENWEBUI_API_KEY
docker compose up -d --build
```

`ENABLE_API_KEYS=true` is already set in compose, so key creation is allowed.

## 4. Verify

```bash
curl https://<DOMAIN>/healthz                                  # {"ok":true}
curl -H "Authorization: Bearer $BACKEND_API_KEY" \
     https://<DOMAIN>/api/models                                # {"data":[...]}
```

Connect OpenRouter inside OpenWebUI if models error (Settings → Connections →
OpenAI API → Base URL `https://openrouter.ai/api/v1`, key = OpenRouter). Confirm
the ids in `backend/adapter/config.js` exist in OpenRouter's catalog.

## 5. Point the extension at prod + ship

```bash
# from the repo root, on your machine:
BACKEND_URL=https://<DOMAIN> BACKEND_API_KEY=<same as .env> npm run build
```

Load/zip `dist/` for the Chrome Web Store.

## Operations

- **Update:** `cd /opt/app && git pull && cd backend && docker compose up -d --build`
- **Logs:** `docker compose logs -f adapter` / `... openwebui`
- **Backup:** the `openwebui-data` Docker volume holds all state (users, chats,
  uploaded files, RAG vectors). Snapshot the EBS volume or
  `docker run --rm -v backend_openwebui-data:/data -v $PWD:/b alpine tar czf /b/owui-backup.tgz /data`.
- **Restart:** `docker compose restart`
- **Costs:** ~$30/mo (t3.medium, on-demand) + OpenRouter token usage.

## Hardening (later)

- Rate limit also at Caddy/Cloudflare in front of the adapter's per-IP limit.
- Move secrets to SSM Parameter Store (ask and I'll wire it).
- Put Cloudflare in front for DDoS + caching of `/api/models`.
