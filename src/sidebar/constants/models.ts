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
  { key: 'webllm-llama', name: 'Llama 3.2', params: '1B', size: '700 Mb', icon: '🦙', desc: 'Lightweight and fast' },
  { key: 'webllm-gemma', name: 'Gemma 2', params: '2B', size: '2.5 Gb', icon: '💎', desc: 'Balanced and smart', recommended: true },
  { key: 'webllm-hermes', name: 'Hermes 3', params: '3B', size: '2.9 Gb', icon: '🎯', desc: 'Excellent instruction-following' },
  { key: 'webllm-deepseek', name: 'DeepSeek-R1', params: '8B', size: '4.5 Gb', icon: '🔬', desc: 'Reasoning model' },
  { key: 'webllm-llama70b', name: 'Llama 3.1', params: '70B', size: '31 Gb', icon: '🦕', desc: 'Most powerful', warning: true },
  { key: 'gemini-nano', name: 'Gemini Nano', params: null, size: null, icon: '✨', desc: 'Chrome embedded model', muted: true },
];
