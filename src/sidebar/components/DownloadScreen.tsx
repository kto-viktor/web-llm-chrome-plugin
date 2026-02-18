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
  'webllm-gemma': {
    name: 'Gemma 2 2B',
    tagline: 'Compact & Capable',
    description: "Google's efficient 2 billion parameter model. Excellent balance of size and capability for everyday tasks.",
    icon: '💎',
    benefits: ['Fast responses', 'Low resource usage', 'Great quality']
  },
  'webllm-hermes': {
    name: 'Hermes 3 3B',
    tagline: 'Balanced & Smart',
    description: "NousResearch's instruction-following 3 billion parameter model. Excellent all-rounder for most tasks.",
    icon: '🎯',
    benefits: ['Great all-rounder', 'Strong reasoning', 'Versatile']
  },
  'webllm-deepseek': {
    name: 'DeepSeek-R1',
    tagline: 'Deep Thinking Model',
    description: 'Advanced reasoning model that thinks step-by-step. Best for complex problems and advanced users who need to see the LLM thinking process.',
    icon: '🔬',
    benefits: ['Chain-of-thought', 'Complex reasoning', 'Problem solving']
  },
  'webllm-llama70b': {
    name: 'Llama 3.1 70B',
    tagline: 'Most Powerful',
    description: "Meta's flagship 70 billion parameter model. Industry-leading performance for the most demanding tasks. Requires high-end GPU with 31GB+ VRAM.",
    icon: '🚀',
    benefits: ['Best quality', 'Advanced reasoning', 'Professional-grade']
  }
};

interface DownloadScreenProps {
  modelKey: string;
}

export function DownloadScreen({ modelKey }: DownloadScreenProps) {
  const info = MODEL_INFO[modelKey] || MODEL_INFO['webllm-hermes'];

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
