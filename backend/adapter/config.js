/**
 * Adapter configuration.
 *
 * The model list is served verbatim at GET /api/models with the featured /
 * default flags the extension uses to highlight and pre-select models. `id`
 * is passed straight through to OpenWebUI → OpenRouter as the `model` field,
 * so each id MUST match an OpenRouter model id that the OpenWebUI connection
 * can serve (see backend/README.md → "Connect OpenRouter").
 *
 * Override the whole list without editing code by pointing MODELS_JSON at a
 * JSON file ({ "data": [...] } or a bare array); see loadModels().
 */

import { readFileSync } from 'node:fs';

/** Curated default catalog. Edit freely; ids must exist on OpenRouter. */
export const DEFAULT_MODELS = [
  {
    id: 'openai/gpt-5.5',
    name: 'GPT-5.5',
    description: 'Latest GPT — strong all-rounder, good default',
    featured: false,
    default: true,
  },
  {
    id: 'anthropic/claude-opus-4.7',
    name: 'Claude Opus 4.7',
    description: 'Top quality — best for hard reasoning and long pages',
    featured: true,
    default: false,
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    description: 'Balanced quality and speed',
    featured: false,
    default: false,
  },
];

/**
 * Resolves the model list: MODELS_JSON file if set, else DEFAULT_MODELS.
 * Accepts either a bare array or an object with a `data` array, so a file
 * captured straight from GET /api/models can be reused as-is.
 */
export function loadModels(env = process.env) {
  if (!env.MODELS_JSON) return DEFAULT_MODELS;
  try {
    const parsed = JSON.parse(readFileSync(env.MODELS_JSON, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed?.data;
    if (Array.isArray(list) && list.length > 0) return list;
    console.warn(`[adapter] MODELS_JSON has no usable list; using defaults`);
  } catch (err) {
    console.warn(`[adapter] failed to read MODELS_JSON: ${err.message}; using defaults`);
  }
  return DEFAULT_MODELS;
}

/** Reads and validates runtime config from the environment. */
export function loadConfig(env = process.env) {
  const openWebUiUrl = (env.OPENWEBUI_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    port: Number(env.PORT ?? 8080),
    // Shared secret the extension sends as `Authorization: Bearer`. When empty,
    // auth is disabled (local dev only — never ship an empty key publicly).
    backendApiKey: env.BACKEND_API_KEY ?? '',
    // OpenWebUI base URL and the service-account API key used to call it.
    openWebUiUrl,
    openWebUiApiKey: env.OPENWEBUI_API_KEY ?? '',
    // Per-IP rate limit for the expensive endpoints (chat + file upload).
    rateLimitRpm: Number(env.RATE_LIMIT_RPM ?? 60),
    rateWindowMs: 60_000,
    models: loadModels(env),
  };
}
