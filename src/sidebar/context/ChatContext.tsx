/**
 * React context for chat state management.
 * Provides streaming responses via React state updates.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { Message, PageAttachment, ChatContextValue } from '../types';

// @ts-ignore - JS module
import { chatService } from '../../services/chat-service.js';
// @ts-ignore - JS module
import { historyManager } from '../../services/history-manager.js';

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
  attachment: PageAttachment | null;
  isAttached: boolean;
}

/**
 * Chat context provider.
 * Manages chat state and provides streaming via React state updates.
 */
export function ChatProvider({ children, attachment, isAttached: propsIsAttached }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isAttached, setIsAttached] = useState<boolean>(propsIsAttached);

  // Subscribe to history changes
  useEffect(() => {
    const unsubscribe = historyManager.subscribe((newMessages: Message[]) => {
      setMessages([...newMessages]);
    });
    return unsubscribe;
  }, []);

  // Update isAttached when prop changes
  useEffect(() => {
    setIsAttached(propsIsAttached);
  }, [propsIsAttached]);

  // Reset isAttached when attachment URL changes (tab switch)
  useEffect(() => {
    setIsAttached(false);
  }, [attachment?.url]);

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(async (message: string) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse('');

    try {
      // Only pass attachment if page is attached
      const effectiveAttachment = isAttached ? attachment : null;

      await chatService.sendMessage(message, {
        attachment: effectiveAttachment,
        onToken: (token: string) => {
          // React state update triggers repaint - this is the key to streaming!
          setCurrentResponse(prev => prev + token);
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[ChatContext] Error sending message:', errorMsg);
      // Add error message to history
      await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setCurrentResponse('');
      // Keep attachment for subsequent messages on same page
      // User can manually clear via X button if needed
    }
  }, [isGenerating, attachment, isAttached]);

  /**
   * Attach the current page.
   */
  const attachPage = useCallback(() => {
    setIsAttached(true);
  }, []);

  /**
   * Detach the current page.
   */
  const detachPage = useCallback(() => {
    setIsAttached(false);
  }, []);

  /**
   * Cancel the current generation.
   * Immediately updates local state for instant UI response.
   */
  const cancelGeneration = useCallback(() => {
    // Immediately update local state for instant UI feedback
    setIsGenerating(false);
    setCurrentResponse('');

    // Tell the service to cancel (will clean up in background)
    chatService.cancelGeneration();
  }, []);

  /**
   * Clear chat history.
   */
  const clearHistory = useCallback(() => {
    chatService.clearHistory();
  }, []);

  /**
   * Set attachment (no-op, managed by parent).
   */
  const setAttachment = useCallback(() => {
    // Attachment is managed by parent via usePageAttachment hook
  }, []);

  const value: ChatContextValue = {
    messages,
    isGenerating,
    currentResponse,
    attachment,
    isAttached,
    sendMessage,
    attachPage,
    detachPage,
    cancelGeneration,
    clearHistory,
    setAttachment,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to access chat context.
 */
export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
