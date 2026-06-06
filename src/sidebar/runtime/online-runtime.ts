/**
 * Online runtime: assistant-ui local runtime backed by an OpenAI-compatible
 * streaming endpoint (the project's BACKEND_URL — see docs/backend-api.md).
 *
 * Why useLocalRuntime over useChatRuntime: the latter (from
 * @assistant-ui/react-ai-sdk) expects the AI SDK v6 UI-message stream format,
 * which a vanilla OpenAI-compatible server (OpenWebUI, vLLM, llama.cpp,
 * Anthropic via proxy, …) does not speak. useLocalRuntime takes a single
 * ChatModelAdapter where we own the wire format — so we can read raw OpenAI
 * SSE deltas directly and avoid running a translation bridge.
 */

import { useMemo, useRef } from 'react';
import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ChatModelRunResult,
  type AssistantRuntime,
} from '@assistant-ui/react';
import { BACKEND_CHAT_URL, backendHeaders } from '../constants/backend-config';
import { threadMessagesToOpenAI, parseOpenAISSE } from './openai-stream';

interface OnlineRuntimeConfig {
  /** Model id from /api/models. Required. */
  model: string;
  /** Stable per-install id, sent as X-User-Id for backend Memories scoping. */
  userId: string;
  /**
   * File ids returned from POST /api/v1/files/. Sent on every chat request
   * as `files: [{type:'file', id}]` so the backend can run RAG over them.
   * Cleared by the caller when starting a new chat / detaching.
   */
  fileIds?: string[];
  /** Optional extra body fields the backend may consume (web_search, tools, …). */
  extraBody?: Record<string, unknown>;
}

/**
 * Returns an AssistantRuntime that streams from the configured backend.
 * Re-renders are cheap — the adapter holds a ref to current config so the
 * runtime instance does not recreate on every config change.
 */
export function useOnlineRuntime(config: OnlineRuntimeConfig): AssistantRuntime {
  const configRef = useRef(config);
  configRef.current = config;

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
        const { model, userId, fileIds, extraBody } = configRef.current;
        const openAIMessages = threadMessagesToOpenAI(messages);

        const body: Record<string, unknown> = {
          model,
          messages: openAIMessages,
          stream: true,
          ...extraBody,
        };
        if (fileIds && fileIds.length > 0) {
          body.files = fileIds.map((id) => ({ type: 'file', id }));
        }

        const response = await fetch(BACKEND_CHAT_URL, {
          method: 'POST',
          signal: abortSignal,
          headers: backendHeaders({ 'X-User-Id': userId }),
          body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
          const detail = await safeReadError(response);
          throw new Error(
            `Backend ${response.status}${detail ? `: ${detail}` : ''} (${BACKEND_CHAT_URL})`,
          );
        }

        let text = '';
        for await (const delta of parseOpenAISSE(response.body, abortSignal)) {
          text += delta;
          yield {
            content: [{ type: 'text', text }],
          };
        }
      },
    }),
    [],
  );

  return useLocalRuntime(adapter);
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '';
  }
}
