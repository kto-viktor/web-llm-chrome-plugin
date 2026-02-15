import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../history-manager.js', () => ({
  historyManager: {
    getRecentContextMessages: vi.fn(() => [])
  }
}));

vi.mock('../../core/llm-interface.js', () => ({
  llm: {}
}));

import { ChatService } from '../chat-service.js';
import { historyManager } from '../history-manager.js';

describe('ChatService.buildMessages', () => {
  let service;

  beforeEach(() => {
    service = new ChatService();
    historyManager.getRecentContextMessages.mockReturnValue([]);
  });

  describe('user message enhancement', () => {
    it('appends page-context reminder when page is attached', () => {
      const pageContent = { title: 'Test', url: 'https://example.com', content: 'body' };
      const messages = service.buildMessages('what is here?', pageContent, true);
      const userMsg = messages[messages.length - 1];

      expect(userMsg.role).toBe('user');
      expect(userMsg.content).toContain('what is here?');
      expect(userMsg.content).toContain('Remember: answer using the page content');
      expect(userMsg.content).toContain('Do not say you cannot access the page');
    });

    it('does not modify user message when not attached', () => {
      const messages = service.buildMessages('hello', null, false);
      const userMsg = messages[messages.length - 1];

      expect(userMsg.role).toBe('user');
      expect(userMsg.content).toBe('hello');
    });

    it('does not modify user message when attached but pageContent is null', () => {
      const messages = service.buildMessages('hello', null, true);
      const userMsg = messages[messages.length - 1];

      expect(userMsg.content).toBe('hello');
    });
  });

  describe('system message', () => {
    it('includes page content in system message when attached', () => {
      const pageContent = { title: 'Test', url: 'https://example.com', content: 'page body' };
      const messages = service.buildMessages('question', pageContent, true);
      const systemMsg = messages[0];

      expect(systemMsg.role).toBe('system');
      expect(systemMsg.content).toContain('MUST use this content');
      expect(systemMsg.content).toContain('page body');
    });

    it('uses general assistant prompt when not attached', () => {
      const messages = service.buildMessages('question', null, false);
      const systemMsg = messages[0];

      expect(systemMsg.role).toBe('system');
      expect(systemMsg.content).not.toContain('<page_content>');
      expect(systemMsg.content).toContain('helpful AI assistant');
    });
  });

  describe('history integration', () => {
    it('includes history messages between system and user', () => {
      historyManager.getRecentContextMessages.mockReturnValue([
        { role: 'user', content: 'prev question' },
        { role: 'assistant', content: 'prev answer' }
      ]);

      const messages = service.buildMessages('new question', null, false);

      expect(messages).toHaveLength(4); // system + 2 history + user
      expect(messages[0].role).toBe('system');
      expect(messages[1]).toEqual({ role: 'user', content: 'prev question' });
      expect(messages[2]).toEqual({ role: 'assistant', content: 'prev answer' });
      expect(messages[3].role).toBe('user');
      expect(messages[3].content).toBe('new question');
    });

    it('passes page url for history filtering when attached', () => {
      const pageContent = { title: 'Test', url: 'https://example.com', content: 'body' };
      service.buildMessages('q', pageContent, true);

      expect(historyManager.getRecentContextMessages).toHaveBeenCalledWith('https://example.com');
    });

    it('passes null for history filtering when not attached', () => {
      service.buildMessages('q', null, false);

      expect(historyManager.getRecentContextMessages).toHaveBeenCalledWith(null);
    });
  });
});