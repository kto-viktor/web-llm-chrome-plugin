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
  'webllm-llama': {
    name: 'Llama 3.2 1B',
    tagline: 'Lightweight & Fast',
    description: "Meta's compact 1 billion parameter model. Quick to download and runs smoothly on modest hardware.",
    icon: '🦙',
    benefits: ['Fast download', 'Low memory', 'Great for basics']
  },
  'webllm-qwen': {
    name: 'Qwen 2.5 7B',
    tagline: 'Balanced & Capable',
    description: "Alibaba's powerful 7 billion parameter model. Excellent for general tasks, summary, and creative writing.",
    icon: '🧠',
    benefits: ['Great all-rounder', 'Strong reasoning', 'Multilingual']
  },
  'webllm-deepseek': {
    name: 'DeepSeek-R1',
    tagline: 'Deep Thinking Model',
    description: 'Advanced reasoning model that thinks step-by-step. Best for complex problems and advanced users, who need to see LLM thinking process.',
    icon: '🔬',
    benefits: ['Chain-of-thought', 'Complex reasoning', 'Problem solving']
  }
};

interface DownloadScreenProps {
  modelKey: string;
}

export function DownloadScreen({ modelKey }: DownloadScreenProps) {
  const info = MODEL_INFO[modelKey] || MODEL_INFO['webllm-qwen'];

  return (
    <div className="download-screen">
      <div className="download-screen-icon">{info.icon}</div>
      <h2 className="download-screen-title">Introducing: {info.name}</h2>
      <p className="download-screen-tagline">{info.tagline}</p>

      <div className="download-screen-message">
        <p><strong>One-time setup</strong> — currently we're downloading LLM directly to your computer.</p>
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
