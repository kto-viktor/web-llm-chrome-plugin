import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock countTokens to avoid gpt-tokenizer dependency in tests
vi.mock('../../utils/token-utils.js', () => ({
  countTokens: (text) => text.length
}));

// Mock chrome.storage.local
globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, cb) => cb({})),
      set: vi.fn((data, cb) => cb())
    }
  }
};

import { HistoryManager } from '../history-manager.js';

describe('HistoryManager.getRecentContextMessages', () => {
  let manager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  it('returns empty array when no messages', () => {
    expect(manager.getRecentContextMessages(null)).toEqual([]);
    expect(manager.getRecentContextMessages('https://example.com')).toEqual([]);
  });

  it('returns tail of no-page messages when pageUrl=null', () => {
    manager.messages = [
      { role: 'user', content: 'hello', timestamp: 1 },
      { role: 'assistant', content: 'hi', timestamp: 2 },
      { role: 'user', content: 'how are you', timestamp: 3 }
    ];

    const result = manager.getRecentContextMessages(null);
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe('hello');
    expect(result[2].content).toBe('how are you');
  });

  it('stops at first page-message when collecting no-page messages', () => {
    manager.messages = [
      { role: 'user', content: 'on page', pageUrl: 'https://example.com', timestamp: 1 },
      { role: 'assistant', content: 'page response', pageUrl: 'https://example.com', timestamp: 2 },
      { role: 'user', content: 'general q', timestamp: 3 },
      { role: 'assistant', content: 'general a', timestamp: 4 }
    ];

    const result = manager.getRecentContextMessages(null);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('general q');
    expect(result[1].content).toBe('general a');
  });

  it('returns tail of page-specific messages when pageUrl provided', () => {
    const pageUrl = 'https://example.com/page';
    manager.messages = [
      { role: 'user', content: 'q1', pageUrl: 'https://example.com/page', timestamp: 1 },
      { role: 'assistant', content: 'a1', pageUrl: 'https://example.com/page', timestamp: 2 },
      { role: 'user', content: 'q2', pageUrl: 'https://example.com/page', timestamp: 3 }
    ];

    const result = manager.getRecentContextMessages(pageUrl);
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe('q1');
  });

  it('stops at first different-context message when collecting page messages', () => {
    const pageUrl = 'https://example.com/page';
    manager.messages = [
      { role: 'user', content: 'q on page', pageUrl: 'https://example.com/page', timestamp: 1 },
      { role: 'assistant', content: 'a on page', pageUrl: 'https://example.com/page', timestamp: 2 },
      { role: 'user', content: 'general q', timestamp: 3 },
      { role: 'assistant', content: 'general a', timestamp: 4 },
      { role: 'user', content: 'back on page', pageUrl: 'https://example.com/page', timestamp: 5 },
      { role: 'assistant', content: 'back on page a', pageUrl: 'https://example.com/page', timestamp: 6 }
    ];

    const result = manager.getRecentContextMessages(pageUrl);
    // Should only get the last 2 (after the general messages break the chain)
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('back on page');
    expect(result[1].content).toBe('back on page a');
  });

  it('handles mixed page/no-page history correctly (only contiguous tail)', () => {
    manager.messages = [
      { role: 'user', content: 'general 1', timestamp: 1 },
      { role: 'assistant', content: 'general 1a', timestamp: 2 },
      { role: 'user', content: 'on page A', pageUrl: 'https://a.com', timestamp: 3 },
      { role: 'assistant', content: 'page A resp', pageUrl: 'https://a.com', timestamp: 4 },
      { role: 'user', content: 'on page B', pageUrl: 'https://b.com', timestamp: 5 },
      { role: 'assistant', content: 'page B resp', pageUrl: 'https://b.com', timestamp: 6 },
      { role: 'user', content: 'general 2', timestamp: 7 },
      { role: 'assistant', content: 'general 2a', timestamp: 8 }
    ];

    // No-page mode: only last 2 general messages
    const noPage = manager.getRecentContextMessages(null);
    expect(noPage).toHaveLength(2);
    expect(noPage[0].content).toBe('general 2');

    // Page A: nothing (not at the tail)
    const pageA = manager.getRecentContextMessages('https://a.com');
    expect(pageA).toHaveLength(0);

    // Page B: nothing (not at the tail either)
    const pageB = manager.getRecentContextMessages('https://b.com');
    expect(pageB).toHaveLength(0);
  });

  it('single message matching context returns it', () => {
    manager.messages = [
      { role: 'user', content: 'only one', timestamp: 1 }
    ];

    const result = manager.getRecentContextMessages(null);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('only one');
  });

  it('single message not matching context returns empty', () => {
    manager.messages = [
      { role: 'user', content: 'on page', pageUrl: 'https://example.com', timestamp: 1 }
    ];

    const result = manager.getRecentContextMessages(null);
    expect(result).toHaveLength(0);
  });
});
