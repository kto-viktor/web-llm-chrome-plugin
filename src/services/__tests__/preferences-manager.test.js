import { describe, it, expect, beforeEach, vi } from 'vitest';

let storage;

beforeEach(() => {
  storage = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (key) => {
          if (typeof key === 'string') return { [key]: storage[key] };
          if (Array.isArray(key)) {
            return Object.fromEntries(key.map((k) => [k, storage[k]]));
          }
          return { ...storage };
        }),
        set: vi.fn(async (data) => {
          Object.assign(storage, data);
        }),
      },
    },
  };
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
});

describe('PreferencesManager', () => {
  it('returns defaults on first load and generates a userId', async () => {
    const { PreferencesManager } = await import('../preferences-manager.js');
    const mgr = new PreferencesManager();
    const prefs = await mgr.load();
    expect(prefs.appMode).toBe('online');
    expect(prefs.userId).toBe('test-uuid');
    expect(storage.preferences.userId).toBe('test-uuid');
  });

  it('persists userId across reloads', async () => {
    storage.preferences = {
      appMode: 'offline',
      userId: 'existing-id',
      selectedOnlineModel: null,
      selectedOfflineModel: 'gemini',
    };
    const { PreferencesManager } = await import('../preferences-manager.js');
    const mgr = new PreferencesManager();
    const prefs = await mgr.load();
    expect(prefs.appMode).toBe('offline');
    expect(prefs.userId).toBe('existing-id');
    expect(prefs.selectedOfflineModel).toBe('gemini');
  });

  it('setMode updates and notifies subscribers', async () => {
    const { PreferencesManager } = await import('../preferences-manager.js');
    const mgr = new PreferencesManager();
    await mgr.load();
    const listener = vi.fn();
    mgr.subscribe(listener);
    await mgr.setMode('offline');
    expect(mgr.get().appMode).toBe('offline');
    expect(storage.preferences.appMode).toBe('offline');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ appMode: 'offline' }));
  });

  it('unsubscribe stops further notifications', async () => {
    const { PreferencesManager } = await import('../preferences-manager.js');
    const mgr = new PreferencesManager();
    await mgr.load();
    const listener = vi.fn();
    const unsub = mgr.subscribe(listener);
    unsub();
    await mgr.setMode('offline');
    expect(listener).not.toHaveBeenCalled();
  });
});
