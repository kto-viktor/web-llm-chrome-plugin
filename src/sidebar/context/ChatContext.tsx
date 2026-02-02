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
}

/**
 * Chat context provider.
 * Manages chat state and provides streaming via React state updates.
 */
export function ChatProvider({ children, attachment }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  // Subscribe to history changes
  useEffect(() => {
    const unsubscribe = historyManager.subscribe((newMessages: Message[]) => {
      setMessages([...newMessages]);
    });
    return unsubscribe;
  }, []);

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(async (message: string) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse('');

    try {
      await chatService.sendMessage(message, {
        attachment,
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
  }, [isGenerating, attachment]);

  /**
   * Request a page summary.
   */
  const requestPageSummary = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse('');

    try {
      await chatService.requestPageSummary(attachment, (token: string) => {
        // React state update triggers repaint
        setCurrentResponse(prev => prev + token);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[ChatContext] Error requesting summary:', errorMsg);
      await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setCurrentResponse('');
      // Keep attachment for subsequent messages on same page
      // User can manually clear via X button if needed
    }
  }, [isGenerating, attachment]);

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
    sendMessage,
    requestPageSummary,
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
