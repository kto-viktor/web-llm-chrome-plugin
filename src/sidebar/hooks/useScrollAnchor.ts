/**
 * Smart auto-scroll hook with user intent detection.
 * Only scrolls to bottom if user is already near bottom (reading latest content).
 * If user scrolls up (reading earlier content), stops auto-scrolling.
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollAnchorOptions {
  enabled?: boolean;          // Enable/disable auto-scroll
  threshold?: number;         // Distance from bottom to consider "at bottom" (px)
  dependencies?: any[];       // Dependencies that trigger scroll check
}

export function useScrollAnchor(options: UseScrollAnchorOptions = {}) {
  const {
    enabled = true,
    threshold = 100,           // 100px from bottom = "at bottom"
    dependencies = []
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Track scroll position to determine if user is near bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setIsNearBottom(distanceFromBottom <= threshold);
  };

  // Auto-scroll to bottom when dependencies change (if user is near bottom)
  useEffect(() => {
    if (!enabled || !isNearBottom) return;

    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, dependencies);  // eslint-disable-line react-hooks/exhaustive-deps

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return {
    containerRef,
    isNearBottom,
    scrollToBottom: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };
}
