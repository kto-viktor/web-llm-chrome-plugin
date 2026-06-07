/**
 * Online model catalog — types and selection helpers.
 *
 * The list lives entirely on the backend at /api/models (see
 * docs/backend-api.md). There is no client-side fallback list: if the backend
 * is unreachable the app switches to offline mode instead.
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
