/**
 * Download screen shown while model is downloading.
 * Shows engaging content with model info.
 */

import React from 'react';
import type { ModelInfo } from '../types';

const MODEL_INFO: Record<string, ModelInfo> = {
  'gemini-nano': {
    name: 'Gemini Nano',
    tagline: 'Chrome Built-in AI',
    description: "Google's compact AI model embedded directly in Chrome. Lightning fast responses with zero download wait.",
    icon: '✨',
    benefits: ['Instant startup', 'No download needed', 'Privacy-first']
  },
  'webllm-qwen3-0.6b': {
    name: 'Qwen3 0.6B',
    tagline: 'BEST for simple laptops',
    description: "Alibaba's tiny 0.6 billion parameter model. Blazing fast responses with minimal resource usage.",
    icon: '⚡',
    benefits: ['Instant responses', 'Very low resource usage', 'Great for simple tasks']
  },
  'webllm-ministral3b': {
    name: 'Ministral 3B - English only',
    tagline: 'Fast, but speaks only english',
    description: "Mistral's compact 3 billion parameter instruction model. Good, but speaks only english.",
    icon: '🎯',
    benefits: ['Great all-rounder', 'Strong reasoning', 'Versatile']
  },
  'webllm-qwen3-4b': {
    name: 'Qwen3 4B',
    tagline: 'Balanced Mid-Size model',
    description: "Alibaba's 4 billion parameter model. A strong balance between speed and capability.",
    icon: '🧠',
    benefits: ['Fast responses', 'Good reasoning', 'Efficient']
  },
  'webllm-qwen3-8b': {
    name: 'Qwen3 8B',
    tagline: 'Strong Reasoning',
    description: "Alibaba's 8 billion parameter model. Excellent reasoning and instruction-following for demanding tasks.",
    icon: '🔥',
    benefits: ['Strong reasoning', 'High quality output', 'Complex tasks']
  },
  'webllm-deepseek': {
    name: 'DeepSeek-R1',
    tagline: 'Deep Thinking Model',
    description: 'Thinking model. Can work on complex tasks, but sometimes unstable.',
    icon: '🔬',
    benefits: ['Chain-of-thought', 'Complex reasoning', 'Problem solving']
  },
  'webllm-llama70b': {
    name: 'Llama 3.1 70B',
    tagline: 'Most Powerful',
    description: "Meta's flagship 70 billion parameter model. Industry-leading performance for the most demanding tasks. Requires high-end GPU with 31GB+ VRAM.",
    icon: '🚀',
    benefits: ['Best quality', 'Advanced reasoning', 'Professional-grade']
  },
};

interface DownloadScreenProps {
  modelKey: string;
}

export function DownloadScreen({ modelKey }: DownloadScreenProps) {
  const info = MODEL_INFO[modelKey] || MODEL_INFO['webllm-ministral3b'];

  return (
    <div className="download-screen">
      <div className="download-screen-icon">{info.icon}</div>
      <h2 className="download-screen-title">Introducing: {info.name}</h2>
      <p className="download-screen-tagline">{info.tagline}</p>

      <div className="download-screen-message">
        <p><strong>One-time setup</strong> — we're currently downloading the LLM directly to your computer.</p>
        <p>Once complete, it's yours forever. No internet needed, complete privacy.</p>
      </div>

      <div className="download-screen-description">
        {info.description}
      </div>

      <ul className="download-screen-benefits">
        {info.benefits.map((benefit, index) => (
          <li key={index}>{benefit}</li>
        ))}
      </ul>
    </div>
  );
}

export { MODEL_INFO };
