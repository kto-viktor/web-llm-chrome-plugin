/**
 * React hook for chat history management.
 * Wraps history-manager subscription with proper cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Message, PageAttachment } from '../types';

// Import the singleton historyManager instance
// @ts-ignore - JS module
import { historyManager } from '../../services/history-manager.js';

interface UseHistoryResult {
  messages: Message[];
  addMessage: (role: 'user' | 'assistant', content: string, attachment?: PageAttachment | null) => Promise<void>;
  clear: () => Promise<void>;
  formatForPrompt: () => string;
}

/**
 * Hook to access chat history state and methods.
 */
export function useHistory(): UseHistoryResult {
  const [messages, setMessages] = useState<Message[]>(historyManager.getMessages());

  useEffect(() => {
    // Subscribe to history changes
    const unsubscribe = historyManager.subscribe((newMessages: Message[]) => {
      setMessages([...newMessages]);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    attachment?: PageAttachment | null
  ) => {
    await historyManager.addMessage(role, content, attachment);
  }, []);

  const clear = useCallback(async () => {
    await historyManager.clear();
  }, []);

  const formatForPrompt = useCallback(() => {
    return historyManager.formatForPrompt();
  }, []);

  return {
    messages,
    addMessage,
    clear,
    formatForPrompt,
  };
}
