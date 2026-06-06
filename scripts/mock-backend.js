#!/usr/bin/env node
/**
 * Mock backend for local development.
 *
 * Speaks the contract from docs/backend-api.md:
 *   GET  /api/models             -> fake model list with featured/default flags
 *   POST /api/chat/completions   -> OpenAI-compatible SSE stream of canned tokens
 *
 * Usage:
 *   node scripts/mock-backend.js                  # listens on :3000, no auth
 *   PORT=4000 node scripts/mock-backend.js        # custom port
 *   BACKEND_API_KEY=dev node scripts/mock-backend.js
 *     # require Authorization: Bearer dev (matches what the extension sends)
 *
 * Then build the extension and reload it:
 *   BACKEND_URL=http://localhost:3000 BACKEND_API_KEY=dev npm run build
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const EXPECTED_KEY = process.env.BACKEND_API_KEY ?? '';

const MODELS = [
  {
    id: 'mock-fast',
    name: 'Mock Fast',
    description: 'Quick canned responses',
    featured: false,
    default: true,
  },
  {
    id: 'mock-smart',
    name: 'Mock Smart',
    description: 'Pretends to think harder',
    featured: true,
    default: false,
  },
  {
    id: 'mock-poet',
    name: 'Mock Poet',
    description: 'Replies in haiku',
  },
];

const CANNED = {
  'mock-fast':
    "Hi! I'm a mock backend. Your message was received and this is a streamed reply, token by token, so you can verify the UI handles streaming properly.",
  'mock-smart':
    "Let me think about that for a moment.\n\nAfter careful consideration, I can say: yes, the streaming pipeline is working end-to-end. The OpenAI-compatible SSE format is being parsed correctly, and the assistant-ui Thread is rendering the deltas as they arrive.",
  'mock-poet':
    'Streams of tiny words\nFlow from the mock backend now\nMarkdown renders fine',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function authOk(req) {
  if (!EXPECTED_KEY) return true;
  const header = req.headers.authorization ?? '';
  return header === `Bearer ${EXPECTED_KEY}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const uploadedFiles = new Map(); // id -> { filename, size, content }

async function handleChat(req, res) {
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    res.writeHead(400);
    res.end('Bad JSON');
    return;
  }

  const modelId = payload.model ?? 'mock-fast';
  const lastUser =
    [...(payload.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? '';

  // Files referenced from /api/v1/files/. OpenWebUI does RAG here; mock just
  // names them so we can verify the wiring from the extension.
  const files = Array.isArray(payload.files) ? payload.files : [];
  const fileSummary = files
    .map((f) => {
      const meta = uploadedFiles.get(f.id);
      return meta
        ? `"${meta.filename}" (${meta.size} bytes)`
        : `(unknown file id=${f.id})`;
    })
    .join(', ');

  const prefix = fileSummary
    ? `[mock RAG over: ${fileSummary}]\n\n`
    : '';

  const reply =
    prefix +
    (CANNED[modelId] ??
      `You said: "${String(lastUser).slice(0, 200)}". This is a mock reply from "${modelId}".`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const tokens = reply.match(/(\s*\S+)/g) ?? [reply];
  for (let i = 0; i < tokens.length; i++) {
    if (res.writableEnded || res.destroyed) return;
    const chunk = {
      id: 'mock',
      object: 'chat.completion.chunk',
      choices: [{ delta: { content: tokens[i] } }],
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    await new Promise((r) => setTimeout(r, 25));
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

const server = createServer(async (req, res) => {
  console.log(`[mock-backend] ${req.method} ${req.url}`);
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!authOk(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing or invalid Authorization header' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: MODELS }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/v1/files/') {
    try {
      const id = `mock-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const raw = await readBody(req);
      // Best-effort filename extraction from multipart; otherwise unknown.
      const filenameMatch = raw.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'upload.txt';
      uploadedFiles.set(id, { filename, size: raw.length, content: raw });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, filename, status: 'uploaded' }));
    } catch (err) {
      console.error('upload error', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat/completions') {
    try {
      await handleChat(req, res);
    } catch (err) {
      console.error('chat error', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[mock-backend] http://localhost:${PORT}`);
  console.log(`[mock-backend]   GET  /api/models`);
  console.log(`[mock-backend]   POST /api/chat/completions`);
  console.log(`[mock-backend]   POST /api/v1/files/`);
  if (EXPECTED_KEY) {
    console.log(`[mock-backend] requires Authorization: Bearer ${EXPECTED_KEY}`);
  } else {
    console.log(`[mock-backend] no auth required (set BACKEND_API_KEY to enable)`);
  }
});
