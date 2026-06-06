/**
 * Online model catalog — types, fallback list, and selection helpers.
 *
 * The canonical list lives on the backend at /api/models (see
 * docs/backend-api.md). The fallback below is shown only when the backend is
 * unreachable on first launch, so the UI never blocks.
 */

export interface OnlineModel {
  /** Opaque id sent back to the backend as `model`. */
  id: string;
  /** Display name shown in the picker. */
  name: string;
  /** Short description shown beneath the name. */
  description?: string;
  /** Highlight this model in the picker (badge / pin). */
  featured?: boolean;
  /** Pre-selected on first launch when no saved choice exists. */
  default?: boolean;
}

/**
 * Fallback used only when /api/models is unreachable. Intentionally minimal —
 * the real list comes from the server. Keep generic so it works against any
 * OpenAI-compatible backend.
 */
export const FALLBACK_ONLINE_MODELS: OnlineModel[] = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: 'Fast, capable',
    featured: true,
    default: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable',
  },
];

/**
 * Picks the model to use on first launch:
 *   1. saved choice if it still exists in the list
 *   2. the model with `default: true` (first one if multiple)
 *   3. the first item
 *
 * Returns null only if the list is empty.
 */
export function pickInitialOnlineModel(
  models: OnlineModel[],
  savedId: string | null | undefined,
): OnlineModel | null {
  if (models.length === 0) return null;
  if (savedId) {
    const saved = models.find((m) => m.id === savedId);
    if (saved) return saved;
  }
  const fallback = models.find((m) => m.default);
  return fallback ?? models[0];
}
