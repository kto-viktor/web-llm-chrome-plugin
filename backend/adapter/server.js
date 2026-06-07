#!/usr/bin/env node
/**
 * Thin adapter in front of OpenWebUI.
 *
 * Implements the extension's contract (docs/backend-api.md) and delegates the
 * heavy lifting — RAG over uploaded files, web search, model inference — to
 * OpenWebUI, which in turn talks to OpenRouter. The adapter's only jobs are:
 *
 *   1. Serve GET /api/models with the curated featured/default catalog the
 *      extension's picker needs (OpenWebUI's own model list lacks those flags).
 *   2. Enforce the build-time shared secret (Authorization: Bearer) and a
 *      per-IP rate limit — the invisible anti-abuse from docs/backend-setup.md.
 *   3. Proxy /api/chat/completions (SSE passthrough) and /api/v1/files/
 *      (multipart upload) to OpenWebUI, injecting OpenWebUI's service-account
 *      credentials so users never authenticate.
 *
 * Zero dependencies — runs on plain Node (>=18 for global fetch/streams).
 *
 * Usage:
 *   OPENWEBUI_URL=http://openwebui:8080 \
 *   OPENWEBUI_API_KEY=sk-owui-... \
 *   BACKEND_API_KEY=sk-shared-... \
 *   node backend/adapter/server.js
 */

import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createRateLimiter } from './rate-limit.js';

const cfg = loadConfig();
const limiter = createRateLimiter({ limit: cfg.rateLimitRpm, windowMs: cfg.rateWindowMs });

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

/** Client IP — first hop of X-Forwarded-For (set by the reverse proxy) or socket. */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

function bearerOk(req) {
  if (!cfg.backendApiKey) return true; // auth disabled (local dev)
  return req.headers.authorization === `Bearer ${cfg.backendApiKey}`;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Headers forwarded to OpenWebUI, with the service-account auth injected. */
function upstreamHeaders(req, extra = {}) {
  const headers = { ...extra };
  if (cfg.openWebUiApiKey) headers.Authorization = `Bearer ${cfg.openWebUiApiKey}`;
  // Pass the per-install id through for future per-user memory scoping.
  const userId = req.headers['x-user-id'];
  if (typeof userId === 'string') headers['X-User-Id'] = userId;
  return headers;
}

/**
 * Streams an OpenWebUI SSE (or any) response body back to the client,
 * mirroring status and content-type. Cancels the upstream read if the client
 * disconnects so we don't hold the connection open.
 */
async function pipeUpstream(upstream, req, res) {
  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  if (!upstream.body) {
    res.end();
    return;
  }
  const reader = upstream.body.getReader();
  const onClose = () => reader.cancel().catch(() => {});
  req.on('close', onClose);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (res.writableEnded || res.destroyed) break;
      res.write(value);
    }
  } finally {
    req.off('close', onClose);
    res.end();
  }
}

async function handleChat(req, res) {
  const body = await readBody(req);
  let upstream;
  try {
    upstream = await fetch(`${cfg.openWebUiUrl}/api/chat/completions`, {
      method: 'POST',
      headers: upstreamHeaders(req, { 'Content-Type': 'application/json' }),
      body,
    });
  } catch (err) {
    console.error('[adapter] chat upstream error:', err.message);
    return sendJson(res, 502, { error: 'Upstream unavailable' });
  }
  await pipeUpstream(upstream, req, res);
}

async function handleFileUpload(req, res) {
  const body = await readBody(req);
  let upstream;
  try {
    upstream = await fetch(`${cfg.openWebUiUrl}/api/v1/files/`, {
      method: 'POST',
      // Preserve the multipart boundary from the original content-type.
      headers: upstreamHeaders(req, {
        'Content-Type': req.headers['content-type'] ?? 'application/octet-stream',
      }),
      body,
    });
  } catch (err) {
    console.error('[adapter] file upstream error:', err.message);
    return sendJson(res, 502, { error: 'Upstream unavailable' });
  }
  await pipeUpstream(upstream, req, res);
}

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Unauthenticated health check for load balancers / deploy platforms.
  if (req.method === 'GET' && req.url === '/healthz') {
    return sendJson(res, 200, { ok: true });
  }

  if (!bearerOk(req)) {
    return sendJson(res, 401, { error: 'Missing or invalid Authorization header' });
  }

  if (req.method === 'GET' && req.url === '/api/models') {
    return sendJson(res, 200, { data: cfg.models });
  }

  // Rate-limit only the expensive endpoints.
  const expensive =
    req.method === 'POST' &&
    (req.url === '/api/chat/completions' || req.url === '/api/v1/files/');
  if (expensive) {
    const { allowed, remaining, retryAfterSec } = limiter.take(clientIp(req));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (!allowed) {
      res.setHeader('Retry-After', String(retryAfterSec));
      return sendJson(res, 429, { error: 'Too many requests, slow down' });
    }
  }

  try {
    if (req.method === 'POST' && req.url === '/api/chat/completions') {
      return await handleChat(req, res);
    }
    if (req.method === 'POST' && req.url === '/api/v1/files/') {
      return await handleFileUpload(req, res);
    }
  } catch (err) {
    console.error('[adapter] handler error:', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    else res.end();
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(cfg.port, () => {
  console.log(`[adapter] listening on :${cfg.port}`);
  console.log(`[adapter]   → OpenWebUI at ${cfg.openWebUiUrl}`);
  console.log(`[adapter]   models: ${cfg.models.map((m) => m.id).join(', ')}`);
  console.log(`[adapter]   auth: ${cfg.backendApiKey ? 'required' : 'DISABLED (no BACKEND_API_KEY)'}`);
  console.log(`[adapter]   rate limit: ${cfg.rateLimitRpm} req/min per IP`);
});
