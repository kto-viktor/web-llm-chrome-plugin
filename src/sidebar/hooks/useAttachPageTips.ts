/**
 * Hook to manage sequential attach-page onboarding tips.
 * Tip 1: "Click here if you want to ask about current page" — shown when page is available.
 * Tip 2: "You can always attach any current page to context" — shown on next page load after tip 1 dismissed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PageAttachment } from '../types';

const TIP1_STORAGE_KEY = 'llm-attach-tip-1-dismissed';
const TIP2_STORAGE_KEY = 'llm-attach-tip-2-dismissed';

export function useAttachPageTips(attachment: PageAttachment | null, isAttached: boolean) {
  const [showTip1, setShowTip1] = useState(false);
  const [showTip2, setShowTip2] = useState(false);

  /** URL that was active when tip 1 was dismissed */
  const tip1DismissedUrlRef = useRef<string | null>(null);

  const isTip1Dismissed = useCallback(() => {
    return localStorage.getItem(TIP1_STORAGE_KEY) === 'true';
  }, []);

  const isTip2Dismissed = useCallback(() => {
    return localStorage.getItem(TIP2_STORAGE_KEY) === 'true';
  }, []);

  // Evaluate tip 1: show once, mark as shown immediately
  useEffect(() => {
    if (!isTip1Dismissed() && attachment && !isAttached) {
      setShowTip1(true);
      localStorage.setItem(TIP1_STORAGE_KEY, 'true');
      tip1DismissedUrlRef.current = attachment.url;
    } else {
      setShowTip1(false);
    }
  }, [attachment, isAttached, isTip1Dismissed]);

  // Evaluate tip 2: show once on a different page, mark as shown immediately
  useEffect(() => {
    if (
      isTip1Dismissed() &&
      !isTip2Dismissed() &&
      attachment &&
      !isAttached &&
      tip1DismissedUrlRef.current !== null &&
      attachment.url !== tip1DismissedUrlRef.current
    ) {
      setShowTip2(true);
      localStorage.setItem(TIP2_STORAGE_KEY, 'true');
    } else if (!isTip1Dismissed() || isAttached || !attachment) {
      setShowTip2(false);
    }
  }, [attachment, isAttached, isTip1Dismissed, isTip2Dismissed]);

  const dismissTip1 = useCallback(() => setShowTip1(false), []);
  const dismissTip2 = useCallback(() => setShowTip2(false), []);

  return {
    showAttachTip1: showTip1,
    showAttachTip2: showTip2,
    dismissAttachTip1: dismissTip1,
    dismissAttachTip2: dismissTip2,
  };
}
