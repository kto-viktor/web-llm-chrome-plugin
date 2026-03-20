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
}

export const MODELS: ModelDefinition[] = [
  { key: 'webllm-qwen3-0.6b', name: 'Qwen3', params: '0.6B', size: '0.6 Gb', icon: '⚡', desc: 'Ultra-compact, fast' },
  { key: 'webllm-ministral3b', name: 'Ministral 3B', params: '3B', size: '1.9 Gb', icon: '🎯', desc: 'Balanced and smart', recommended: true },
  { key: 'webllm-qwen3-4b', name: 'Qwen3', params: '4B', size: '2.5 Gb', icon: '🧠', desc: 'Capable mid-size' },
  { key: 'webllm-qwen3-8b', name: 'Qwen3', params: '8B', size: '4.5 Gb', icon: '🔥', desc: 'Strong reasoning' },
  { key: 'webllm-deepseek', name: 'DeepSeek-R1', params: '8B', size: '4.5 Gb', icon: '🔬', desc: 'Reasoning model' },
  { key: 'webllm-llama70b', name: 'Llama 3.1', params: '70B', size: '31 Gb', icon: '🦕', desc: 'Most powerful', warning: true },
  { key: 'gemini-nano', name: 'Gemini Nano', params: null, size: null, icon: '✨', desc: 'Chrome embedded model', muted: true },
];
