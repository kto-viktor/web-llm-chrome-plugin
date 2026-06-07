import { describe, it, expect } from 'vitest';
import { loadModels, loadConfig, DEFAULT_MODELS } from '../config.js';
import { createRateLimiter } from '../rate-limit.js';

describe('config.loadModels', () => {
  it('returns defaults when MODELS_JSON unset', () => {
    expect(loadModels({})).toBe(DEFAULT_MODELS);
  });

  it('falls back to defaults when the file is unreadable', () => {
    expect(loadModels({ MODELS_JSON: '/nonexistent/path.json' })).toBe(DEFAULT_MODELS);
  });

  it('exposes exactly one default model in the catalog', () => {
    const defaults = DEFAULT_MODELS.filter((m) => m.default);
    expect(defaults).toHaveLength(1);
  });
});

describe('config.loadConfig', () => {
  it('disables auth when no BACKEND_API_KEY', () => {
    const cfg = loadConfig({});
    expect(cfg.backendApiKey).toBe('');
  });

  it('strips trailing slash from OPENWEBUI_URL', () => {
    const cfg = loadConfig({ OPENWEBUI_URL: 'http://owui:8080/' });
    expect(cfg.openWebUiUrl).toBe('http://owui:8080');
  });

  it('parses rate limit from env', () => {
    const cfg = loadConfig({ RATE_LIMIT_RPM: '120' });
    expect(cfg.rateLimitRpm).toBe(120);
    expect(cfg.rateWindowMs).toBe(60_000);
  });
});

describe('rate-limit', () => {
  it('allows up to the limit then blocks within the window', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const results = [1, 2, 3, 4].map(() => limiter.take('1.1.1.1').allowed);
    expect(results).toEqual([true, true, true, false]);
  });

  it('tracks IPs independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
    expect(limiter.take('b').allowed).toBe(true);
  });

  it('reports remaining count', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.take('x').remaining).toBe(1);
    expect(limiter.take('x').remaining).toBe(0);
  });
});
