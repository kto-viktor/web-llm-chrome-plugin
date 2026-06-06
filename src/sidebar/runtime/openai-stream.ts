/**
 * Helpers for talking the OpenAI streaming protocol from the browser.
 *
 *   - threadMessagesToOpenAI: flattens assistant-ui ThreadMessage[] into the
 *     simple {role, content} array OpenAI-compatible servers expect.
 *   - parseOpenAISSE: reads a Response body as Server-Sent Events of
 *     `chat.completion.chunk` deltas and yields their content tokens.
 *
 * Kept separate from online-runtime.ts so it can be unit-tested without
 * pulling React.
 */

import type { ThreadMessage } from '@assistant-ui/react';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Best-effort plain-text extraction from a ThreadMessage's parts. Tool calls,
 * sources and reasoning are flattened to nothing — they are stored in metadata
 * on the assistant-ui side and we don't echo them back to the model.
 */
export function threadMessageToText(message: ThreadMessage): string {
  return message.content
    .map((part) => {
      if (part.type === 'text') return part.text;
      return '';
    })
    .join('');
}

export function threadMessagesToOpenAI(
  messages: readonly ThreadMessage[],
): OpenAIMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: threadMessageToText(m),
  }));
}

/**
 * Reads an OpenAI-style SSE stream and yields the text deltas in order.
 *
 * Wire format (one event per line):
 *   data: {"choices":[{"delta":{"content":"Hi"}}]}
 *   data: {"choices":[{"delta":{"content":" there"}}]}
 *   data: [DONE]
 *
 * Robust to multi-line events, partial chunks across reads, and the trailing
 * [DONE] sentinel.
 */
export async function* parseOpenAISSE(
  body: ReadableStream<Uint8Array>,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (abortSignal?.aborted) {
        await reader.cancel();
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        const delta = parseSSELine(line);
        if (delta === DONE) return;
        if (delta !== null) yield delta;
      }
    }
    const tail = parseSSELine(buffer.trim());
    if (tail !== null && tail !== DONE) yield tail;
  } finally {
    reader.releaseLock();
  }
}

const DONE = Symbol('done');

function parseSSELine(line: string): string | typeof DONE | null {
  if (!line) return null;
  if (line.startsWith(':')) return null;
  if (!line.startsWith('data:')) return null;

  const payload = line.slice(5).trim();
  if (!payload) return null;
  if (payload === '[DONE]') return DONE;

  try {
    const parsed = JSON.parse(payload);
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') return delta;
    return null;
  } catch {
    return null;
  }
}
