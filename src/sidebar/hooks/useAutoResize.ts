/**
 * React hook for textarea auto-resize functionality.
 */

import { useCallback, useRef, useEffect } from 'react';

interface UseAutoResizeResult {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleInput: () => void;
  reset: () => void;
}

const MAX_HEIGHT = 120;
const MIN_HEIGHT = 36;

/**
 * Hook to auto-resize textarea based on content.
 */
export function useAutoResize(): UseAutoResizeResult {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height, clamped to min/max
    const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const reset = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = `${MIN_HEIGHT}px`;
  }, []);

  // Resize on mount if there's content
  useEffect(() => {
    resize();
  }, [resize]);

  return {
    textareaRef,
    handleInput: resize,
    reset,
  };
}
