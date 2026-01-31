/**
 * React hook for page attachment management.
 * Handles loading page content and tab change events.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PageAttachment } from '../types';

// @ts-ignore - JS module
import { getPageContent } from '../../services/page-extractor.js';

interface UsePageAttachmentResult {
  attachment: PageAttachment | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  clear: () => void;
}

/**
 * Hook to manage page attachment state.
 * Automatically reloads when tab changes.
 */
export function usePageAttachment(): UsePageAttachmentResult {
  const [attachment, setAttachment] = useState<PageAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAttachment = useCallback(async () => {
    setIsLoading(true);
    try {
      const pageContent = await getPageContent();

      // Validate content - check for error flags
      if (pageContent &&
          !pageContent.content?.includes('not available') &&
          pageContent.title) {
        setAttachment({
          title: pageContent.title,
          url: pageContent.url,
          content: pageContent.content,
          tokenCount: pageContent.tokenCount || 0,
          truncated: pageContent.truncated || false,
        });
      } else {
        setAttachment(null);
      }
    } catch (error) {
      console.error('[usePageAttachment] Failed to load page content:', error);
      setAttachment(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setAttachment(null);
  }, []);

  // Load initial attachment
  useEffect(() => {
    loadAttachment();
  }, [loadAttachment]);

  // Listen for tab changes
  useEffect(() => {
    const handleTabChange = () => {
      console.log('[usePageAttachment] Tab changed, reloading attachment...');
      loadAttachment();
    };

    // Listen for tab activation
    chrome.tabs?.onActivated?.addListener(handleTabChange);

    // Listen for tab URL changes
    chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        handleTabChange();
      }
    });

    // Listen for window focus changes
    chrome.windows?.onFocusChanged?.addListener(handleTabChange);

    return () => {
      chrome.tabs?.onActivated?.removeListener(handleTabChange);
      chrome.windows?.onFocusChanged?.removeListener(handleTabChange);
    };
  }, [loadAttachment]);

  return {
    attachment,
    isLoading,
    reload: loadAttachment,
    clear,
  };
}
