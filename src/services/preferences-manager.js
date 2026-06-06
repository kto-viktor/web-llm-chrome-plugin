/**
 * User preferences persisted to chrome.storage.local.
 *
 * Single source of truth for cross-cutting choices that the UI and runtime
 * layers both care about — currently:
 *   - appMode: 'online' | 'offline'
 *   - userId:  stable per-install UUID, sent to the online backend as
 *              X-User-Id so its Memories layer can scope long-term memory
 *   - selectedOnlineModel:  last picked online model id
 *   - selectedOfflineModel: last picked offline model key
 *
 * Subscriber pattern mirrors history-manager.js so React hooks plug in the
 * same way (see useAppMode.ts).
 *
 * @module services/preferences-manager
 */

const STORAGE_KEY = 'preferences';

const DEFAULT_PREFERENCES = Object.freeze({
  appMode: 'online',
  userId: null,
  selectedOnlineModel: null,
  selectedOfflineModel: null,
});

/**
 * @typedef {Object} Preferences
 * @property {'online'|'offline'} appMode
 * @property {string|null} userId
 * @property {string|null} selectedOnlineModel
 * @property {string|null} selectedOfflineModel
 */

/**
 * Generates a UUID v4. Uses crypto.randomUUID where available (modern Chrome),
 * falls back to a sufficient ad-hoc generator otherwise.
 * @returns {string}
 */
function generateUserId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class PreferencesManager {
  constructor() {
    /** @type {Preferences} */
    this.prefs = { ...DEFAULT_PREFERENCES };
    /** @type {Set<(prefs: Preferences) => void>} */
    this.listeners = new Set();
    /** @type {boolean} */
    this.loaded = false;
    /** @type {Promise<void>|null} */
    this.loadingPromise = null;
  }

  /**
   * Loads prefs from chrome.storage.local. Idempotent — repeat calls return
   * the same in-flight promise. Generates and persists a userId on first run.
   * @returns {Promise<Preferences>}
   */
  async load() {
    if (this.loaded) return this.prefs;
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.prefs;
    }
    this.loadingPromise = (async () => {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const raw = stored[STORAGE_KEY] || {};
      this.prefs = { ...DEFAULT_PREFERENCES, ...raw };
      if (!this.prefs.userId) {
        this.prefs.userId = generateUserId();
        await this.persist();
      }
      this.loaded = true;
    })();
    await this.loadingPromise;
    return this.prefs;
  }

  /**
   * Returns the in-memory snapshot. Call load() first if you need fresh data.
   * @returns {Preferences}
   */
  get() {
    return this.prefs;
  }

  /**
   * Updates one or more preference fields and notifies subscribers.
   * @param {Partial<Preferences>} patch
   */
  async update(patch) {
    if (!this.loaded) await this.load();
    this.prefs = { ...this.prefs, ...patch };
    await this.persist();
    this.notify();
  }

  /**
   * Convenience for the most common write.
   * @param {'online'|'offline'} mode
   */
  async setMode(mode) {
    await this.update({ appMode: mode });
  }

  /**
   * @param {(prefs: Preferences) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this.prefs);
  }

  async persist() {
    await chrome.storage.local.set({ [STORAGE_KEY]: this.prefs });
  }
}

/**
 * Singleton — one preferences store per extension instance.
 */
export const preferencesManager = new PreferencesManager();
