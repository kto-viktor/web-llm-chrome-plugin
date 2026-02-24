/**
 * Google Analytics 4 tracking service using Measurement Protocol.
 * Sends events directly via fetch() — no external scripts needed.
 * Compatible with Chrome Extension Manifest V3 CSP.
 * @module services/analytics
 */

const GA4_MEASUREMENT_ID = 'YOUR_MEASUREMENT_ID';
const GA4_API_SECRET = 'YOUR_API_SECRET';

const ENDPOINT =
  `https://www.google-analytics.com/mp/collect` +
  `?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

/**
 * Gets or creates a persistent anonymous client ID stored in chrome.storage.local.
 * The ID is a random UUID generated once and reused across sessions (no PII).
 */
async function getClientId(): Promise<string> {
  try {
    const result = await chrome.storage.local.get('ga_client_id');
    if (result.ga_client_id) return result.ga_client_id as string;
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ ga_client_id: id });
    return id;
  } catch {
    return 'unknown';
  }
}

/**
 * Sends an event to GA4 via Measurement Protocol.
 * Silently ignores all errors — analytics must never break the extension.
 */
async function trackEvent(name: string, params: Record<string, unknown> = {}): Promise<void> {
  try {
    const clientId = await getClientId();
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params }],
      }),
    });
  } catch {
    // Silently ignore — analytics errors must not disrupt the user experience
  }
}

/**
 * Analytics event helpers for the Local LLM extension.
 * Each method corresponds to a specific user action or lifecycle event.
 */
export const analytics = {
  /** Extension sidebar was opened. */
  sidebarOpened: () => trackEvent('sidebar_opened'),

  /** User selected a model from the dropdown or model bubbles. */
  modelSelected: (modelId: string) => trackEvent('model_selected', { model_id: modelId }),

  /** Model finished loading and is ready to use (after download or cache load). */
  modelLoaded: (modelId: string, durationMs: number) =>
    trackEvent('model_loaded', { model_id: modelId, duration_ms: durationMs }),

  /** User sent a chat message. */
  messageSent: (modelId: string) => trackEvent('message_sent', { model_id: modelId }),

  /** User attached the current page to the chat context. */
  pageAttached: () => trackEvent('page_attached'),

  /** User stopped LLM generation mid-stream. */
  generationStopped: () => trackEvent('generation_stopped'),

  /** User started a new chat (cleared history). */
  newChat: () => trackEvent('new_chat'),

  /** User confirmed a model download (clicked "Download"). */
  downloadStarted: (modelId: string) =>
    trackEvent('model_download_started', { model_id: modelId }),

  /** Model downloaded and loaded successfully. */
  downloadSuccess: (modelId: string, durationMs: number) =>
    trackEvent('model_download_success', { model_id: modelId, duration_ms: durationMs }),

  /** Model download failed with an error. */
  downloadFailed: (modelId: string, error: string) =>
    trackEvent('model_download_failed', { model_id: modelId, error }),

  /** User cancelled a download before it completed. */
  downloadAbandoned: (modelId: string, progressPct: number) =>
    trackEvent('model_download_abandoned', { model_id: modelId, progress_pct: progressPct }),
};