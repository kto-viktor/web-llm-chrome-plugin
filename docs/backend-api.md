# Backend API contract (online mode)

This document is the contract the extension's online mode relies on. Any backend
that implements it can replace OpenWebUI without changes to the extension.

Base URL is the build-time `BACKEND_URL` (see `src/sidebar/constants/backend-config.ts`).

## Endpoints

### `GET {BACKEND_URL}/api/models`

Returns the list of models the backend can serve.

**Response (200):**
```json
{
  "data": [
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o mini",
      "description": "Fast, cheap",
      "featured": false,
      "default": true
    },
    {
      "id": "claude-sonnet-4-6",
      "name": "Claude Sonnet 4.6",
      "description": "Balanced",
      "featured": true,
      "default": false
    }
  ]
}
```

Fields:
- `id` — opaque to the extension, echoed back as `model` on `/api/chat/completions` calls.
- `name` and `description` — surfaced in the model picker.
- `featured` (optional, default `false`) — UI hint to highlight / pin this model.
- `default` (optional, default `false`) — pre-selected on first launch if the
  user has no saved choice. Exactly one model SHOULD have `default: true`;
  the extension falls back to the first item if zero or many do.

The extension caches the list and falls back to a hardcoded list if the endpoint
is unreachable.

### `POST {BACKEND_URL}/api/chat/completions`

OpenAI-compatible chat completion with SSE streaming.

**Request:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user",   "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "stream": true,
  "tools": [...],          // optional, when web search etc. is enabled
  "tool_choice": "auto",   // optional
  "experimental_attachments": [
    {
      "name": "page.html",
      "contentType": "text/markdown",
      "url": "data:text/markdown;base64,..."
    }
  ]
}
```

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <BACKEND_API_KEY>` — build-time shared secret baked
  into the extension bundle. Not real auth (anyone unpacking the extension can
  read it); just a deterrent against drive-by traffic. The backend is expected
  to reject requests missing it. Combine with IP-based rate limiting for actual
  protection. Sent on every request; users never see it.
- `X-User-Id: <stable per-install UUID>` — used by the backend's Memories layer
  to scope long-term memory per installation. Generated once on first launch and
  stored in `chrome.storage.local`.

**Response:** `text/event-stream` of `chat.completion.chunk` events; final
`data: [DONE]`. Standard OpenAI delta format:
```
data: {"id":"…","choices":[{"delta":{"content":"hi"}}]}
data: {"id":"…","choices":[{"delta":{"content":" there"}}]}
data: {"id":"…","choices":[{"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

Tool calls follow the OpenAI v2 format (`delta.tool_calls[].function.{name,arguments}`).

### Cancellation

The client closes the fetch via `AbortController.abort()`. The backend should
release resources promptly when the connection drops.

## Page attachments — handling on the backend

`experimental_attachments` carries the page Readability extracted on the client.
The backend is expected to:

1. If the attachment fits comfortably in context (< ~4k tokens) — inline it as a
   system message.
2. Otherwise — chunk + embed + retrieve relevant slices for the current user
   message (RAG). OpenWebUI Documents does this automatically when you upload via
   its file API; if your backend exposes a different endpoint for upload, the
   extension's `online-runtime.ts` is the place to wire it.

## Memories — handling on the backend

The backend is expected to maintain per-`X-User-Id` long-term memory and inject
relevant facts into the system prompt automatically. The extension does not
manage memory state directly; it just sends the user id.

## Web search / tools

Configured server-side. The extension renders `delta.tool_calls` events using
assistant-ui's default tool-call UI; no client-side tool implementations.

### `POST {BACKEND_URL}/api/v1/files/`

Uploads a file (typically Readability-extracted page content) so the backend
can run RAG / chunking / retrieval over it on subsequent chat completions.

**Request:** `multipart/form-data` with a `file` field (Blob, filename, MIME).

**Response (200):**
```json
{ "id": "f-abc123", "filename": "page-title.txt", "status": "uploaded" }
```

**Headers:** `Authorization: Bearer <BACKEND_API_KEY>` (same scheme as
`/api/chat/completions`).

The client never deletes files — the backend is expected to GC them by user
id / age / size limits.

### Referencing uploaded files from `/api/chat/completions`

Add a `files` array to the chat request body:

```json
{
  "model": "...",
  "messages": [...],
  "stream": true,
  "files": [{ "type": "file", "id": "f-abc123" }]
}
```

The backend is responsible for fetching each file's content, chunking it if
needed, retrieving the slices relevant to the latest user message, and
prepending them to the model context. The extension does no RAG.

This matches OpenWebUI's native file flow; against other backends, document
how their RAG API maps to this contract.

## Errors

- **401 Unauthorized** — missing/invalid `Authorization` header. The extension
  surfaces this as a generic "backend unavailable" message; users should never
  see it in normal operation.
- **429 Too Many Requests** — rate limit hit. The extension shows a friendly
  retry message and lets the user try again.
- Any other 4xx/5xx — surfaced as the backend's response text (truncated).

## Versioning

Breaking changes require a new path segment (`/api/v2/...`). The extension does
not negotiate versions; whatever version `BACKEND_URL` resolves to is what it
uses.
