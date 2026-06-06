/**
 * Backend configuration for online mode.
 *
 * BACKEND_URL and BACKEND_API_KEY are inlined at build time via esbuild
 * `define` (see build.js). Override at build with:
 *   BACKEND_URL=https://chat.example.com BACKEND_API_KEY=sk-xxx npm run build
 *
 * The contract is documented in docs/backend-api.md. The API key is a
 * deterrent against drive-by abuse, not real auth — see
 * docs/backend-setup.md "Anti-abuse" for the rationale.
 */

declare const process: {
  env: { BACKEND_URL?: string; BACKEND_API_KEY?: string };
};

const fallbackUrl = 'http://localhost:3000';

const rawUrl =
  (typeof process !== 'undefined' && process.env && process.env.BACKEND_URL) || fallbackUrl;

export const BACKEND_URL = rawUrl.replace(/\/+$/, '');

export const BACKEND_API_KEY =
  (typeof process !== 'undefined' && process.env && process.env.BACKEND_API_KEY) || '';

export const BACKEND_MODELS_PATH = '/api/models';
export const BACKEND_CHAT_PATH = '/api/chat/completions';
export const BACKEND_FILES_PATH = '/api/v1/files/';

export const BACKEND_MODELS_URL = `${BACKEND_URL}${BACKEND_MODELS_PATH}`;
export const BACKEND_CHAT_URL = `${BACKEND_URL}${BACKEND_CHAT_PATH}`;
export const BACKEND_FILES_URL = `${BACKEND_URL}${BACKEND_FILES_PATH}`;

/**
 * Default request headers for any backend call. Includes Authorization when a
 * build-time key is set; omitted otherwise so local dev can hit an unsecured
 * backend without configuring a key.
 */
export function backendHeaders(extra?: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BACKEND_API_KEY) base.Authorization = `Bearer ${BACKEND_API_KEY}`;
  return extra ? { ...base, ...extra } : base;
}
