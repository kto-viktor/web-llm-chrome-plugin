/**
 * Language tip hook - shows banner when non-Latin characters are detected
 * in user input while using Llama 1B (English-only model).
 * Dismissal persists via localStorage.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'llm-language-tip-dismissed';

/** Returns true if text contains non-Latin characters. */
function hasNonLatinChars(text: string): boolean {
  return /[^\u0000-\u024F\s\d\p{P}\p{S}]/u.test(text);
}

export function useLanguageTip(modelName: string | null, lastUserMessage: string | null) {
  const [showTip, setShowTip] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (isDismissed || modelName !== 'webllm-llama' || !lastUserMessage) {
      return;
    }

    if (hasNonLatinChars(lastUserMessage)) {
      setShowTip(true);
    }
  }, [lastUserMessage, modelName, isDismissed]);

  const dismissTip = () => {
    setShowTip(false);
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return {
    showLanguageTip: showTip,
    dismissLanguageTip: dismissTip
  };
}