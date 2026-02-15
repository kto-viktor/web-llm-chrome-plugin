/**
 * Performance tip hook - shows tooltip after 10s of streaming.
 * Manages timing logic and localStorage persistence for dismissal.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'llm-performance-tip-dismissed';
const SHOW_DELAY_MS = 10000; // 10 seconds

export function usePerformanceTip(isGenerating: boolean, modelName: string | null) {
  const [showTip, setShowTip] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    // Don't show if already dismissed, not generating, or already using Llama 1B
    if (isDismissed || !isGenerating || modelName === 'webllm-llama') {
      setShowTip(false);
      return;
    }

    // Start timer when generation begins
    const timer = setTimeout(() => {
      setShowTip(true);
    }, SHOW_DELAY_MS);

    // Clear timer when generation stops
    return () => {
      clearTimeout(timer);
      setShowTip(false);
    };
  }, [isGenerating, isDismissed, modelName]);

  const dismissTip = () => {
    setShowTip(false);
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return {
    showTip,
    dismissTip
  };
}
