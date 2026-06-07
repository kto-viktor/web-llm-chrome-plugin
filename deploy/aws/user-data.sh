#!/bin/bash
# EC2 user-data bootstrap for the online backend (OpenWebUI + adapter + Caddy).
#
# Target: Amazon Linux 2023. Paste this into the instance's "User data" field at
# launch. It installs Docker + the compose plugin, clones the repo, and seeds a
# blank backend/.env. It does NOT start the stack or hold any secrets — you fill
# backend/.env and run the two-phase startup over SSH afterwards (OpenWebUI's
# API key can only be minted after its first boot). See README.md in this dir.
set -euxo pipefail

REPO_URL="https://github.com/kto-viktor/web-llm-chrome-plugin.git"
APP_DIR="/opt/app"

dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

# docker compose v2 plugin (matches instance arch: x86_64 / aarch64)
mkdir -p /usr/libexec/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose

# Clone the repo (idempotent across reboots / re-runs)
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R ec2-user:ec2-user "$APP_DIR"

# Seed backend/.env from the template if absent (operator fills real values).
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  chmod 600 "$APP_DIR/backend/.env"
  chown ec2-user:ec2-user "$APP_DIR/backend/.env"
fi

cat > /etc/motd <<'MOTD'
=== Online backend instance ===
Code: /opt/app    Backend: /opt/app/backend

Finish setup (see /opt/app/deploy/aws/README.md):
  1) cd /opt/app/backend && nano .env
       set DOMAIN, OPENROUTER_API_KEY, BACKEND_API_KEY (openssl rand -hex 24)
  2) docker compose up -d openwebui
       open https://DOMAIN -> create admin -> Settings > Account > API Keys > create
       put it in .env as OPENWEBUI_API_KEY
  3) docker compose up -d --build
       curl https://DOMAIN/healthz   # {"ok":true}
MOTD
