/**
 * Formats AI responses with think tags and markdown.
 * @module utils/response-formatter
 */

import { marked } from 'marked';

// Configure marked for safe output
marked.setOptions({
  breaks: true,
  gfm: true
});

/**
 * Formats AI response content.
 * - Extracts and styles <think> blocks (DeepSeek reasoning)
 * - Parses markdown to HTML
 * @param {string} text - Raw response text
 * @returns {string} Formatted HTML string
 */
export function formatResponse(text) {
  if (!text) return '';

  let result = text;

  // Extract and replace <think> blocks with collapsible spoiler
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  result = result.replace(thinkRegex, (match, content) => {
    // Escape HTML in think content for safety, then format
    const escaped = escapeHtml(content.trim());
    return `<details class="think-block"><summary class="think-label">LLM scratchpad (click to see)</summary><div class="think-content">${escaped}</div></details>`;
  });

  // Parse remaining content as markdown
  result = marked.parse(result);

  return result;
}

/**
 * Escapes HTML special characters.
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
