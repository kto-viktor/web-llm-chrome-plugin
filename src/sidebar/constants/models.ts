/**
 * Shared model definitions used across the sidebar UI.
 * Single source of truth for model metadata.
 */

export interface ModelDefinition {
  key: string;
  name: string;
  params: string | null;
  size: string | null;
  icon: string;
  desc: string;
  recommended?: boolean;
  warning?: boolean;
  muted?: boolean;
  /** Model supports the Qwen-style `/no_think` soft switch to disable thinking */
  supportsThinking?: boolean;
}

/** Lookup a model definition by key. */
export function getModel(key: string | null | undefined): ModelDefinition | null {
  if (!key) return null;
  return MODELS.find(m => m.key === key) ?? null;
}

export const MODELS: ModelDefinition[] = [
  { key: 'webllm-qwen3-0.6b', name: 'Qwen3 Light', params: '0.6B', size: '300 MB 👍', icon: '⚡', desc: 'BEST for simple laptops', supportsThinking: true },
  { key: 'webllm-ministral3b', name: 'Ministral 3B', params: '3B', size: '1.8 Gb', icon: '🎯', desc: 'Fast, but speaks only english' },
  { key: 'webllm-qwen3-4b', name: 'Qwen3 Middle', params: '4B', size: '2 Gb', icon: '🧠', desc: 'Best balance if you have some GPU', recommended: true, supportsThinking: true },
  { key: 'webllm-qwen3-8b', name: 'Qwen3 Strong', params: '8B', size: '4.3 Gb', icon: '🔥', desc: 'Strong reasoning', supportsThinking: true },
  { key: 'webllm-deepseek', name: 'DeepSeek-R1', params: '8B', size: '4.5 Gb', icon: '🔬', desc: 'Reasoning model' },
  { key: 'webllm-qwen35-9b', name: 'Qwen3.5 Large', params: '9B', size: '5.5 Gb', icon: '🌟', desc: 'Latest Qwen — strongest open-source reasoning', supportsThinking: true },
  { key: 'webllm-llama70b', name: 'Llama 3.1', params: '70B', size: '31 Gb', icon: '🦕', desc: 'Most powerful', warning: true },
  { key: 'gemini-nano', name: 'Gemini Nano', params: null, size: null, icon: '✨', desc: 'Chrome embedded model', muted: true },
];
