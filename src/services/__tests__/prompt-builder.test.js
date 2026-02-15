import { describe, it, expect } from 'vitest';
import { buildSystemMessage } from '../prompt-builder.js';

describe('buildSystemMessage', () => {
  describe('without page content', () => {
    it('returns general assistant prompt', () => {
      const result = buildSystemMessage(null);
      expect(result).toContain('You are a helpful AI assistant');
      expect(result).toContain('Guidelines');
    });

    it('does not include page-specific instructions', () => {
      const result = buildSystemMessage(null);
      expect(result).not.toContain('<page_content>');
      expect(result).not.toContain('MUST use this content');
      expect(result).not.toContain('IMPORTANT');
    });
  });

  describe('with page content', () => {
    const pageContent = {
      title: 'Test Page',
      url: 'https://example.com',
      content: 'This is the page body text.'
    };

    it('includes page content in <page_content> tags', () => {
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('<page_content>');
      expect(result).toContain('</page_content>');
      expect(result).toContain('This is the page body text.');
    });

    it('includes title and url', () => {
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<url>https://example.com</url>');
    });

    it('contains directive to use page content', () => {
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('MUST use this content');
    });

    it('contains IMPORTANT reinforcement after page content', () => {
      const result = buildSystemMessage(pageContent);
      const pageEnd = result.indexOf('</page_content>');
      const important = result.indexOf('IMPORTANT: Answer based on the page content above');
      expect(important).toBeGreaterThan(pageEnd);
    });

    it('contains "do not say you cannot access" instruction', () => {
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('Do not say you cannot access the page');
    });
  });

  describe('edge cases', () => {
    it('appends truncation notice when content is truncated', () => {
      const pageContent = {
        title: 'Long Page',
        url: 'https://example.com/long',
        content: 'Some content...',
        truncated: true
      };
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('[Content truncated to 3000 words]');
    });

    it('uses error placeholder when title is missing', () => {
      const pageContent = { url: 'https://example.com', content: 'body' };
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('LOCAL_LLM_ERR_CONTENT_NOT_AVAILABLE');
    });

    it('uses error placeholder when url is missing', () => {
      const pageContent = { title: 'Page', content: 'body' };
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('LOCAL_LLM_ERR_CONTENT_NOT_AVAILABLE');
    });

    it('handles empty content string', () => {
      const pageContent = { title: 'Page', url: 'https://example.com', content: '' };
      const result = buildSystemMessage(pageContent);
      expect(result).toContain('<page_content>');
      expect(result).toContain('<title>Page</title>');
    });
  });
});