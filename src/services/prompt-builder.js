/**
 * Prompt builder service for constructing system messages.
 * @module services/prompt-builder
 */

/**
 * Formats page content values from the page content object.
 * @param {Object} pageContent - The page content object
 * @returns {Object} Formatted values for page placeholders
 */
function formatPageContent(pageContent) {
  if (!pageContent) {
    return {
      page_title: '',
      page_url: '',
      page_content: '[No page content available. Ask user to refresh the page; mention, that chrome:// internal urls will not work]'
    };
  }

  let content = pageContent.content || '';
  if (pageContent.truncated) {
    content += '\n[Content truncated to 3000 words]';
  }

  return {
    page_title: pageContent.title || 'LOCAL_LLM_ERR_CONTENT_NOT_AVAILABLE',
    page_url: pageContent.url || 'LOCAL_LLM_ERR_CONTENT_NOT_AVAILABLE',
    page_content: content
  };
}

/**
 * Builds the system message content for the messages array.
 * Includes the system prompt, page context, and guidelines.
 * @param {Object|null} pageContent - The page content object (title, url, content)
 * @returns {string} The system message content
 */
export function buildSystemMessage(pageContent) {
  if (!pageContent) {
    return [
      'You are a helpful AI assistant. Answer the user\'s questions to the best of your ability.',
      '',
      'Guidelines:',
      '- Be helpful, accurate, and concise',
      '- If you don\'t know something, say so',
      '- Provide clear explanations when needed',
      '- Answer the user in the same language they asked the question in'
    ].join('\n');
  }

  const pageValues = formatPageContent(pageContent);

  return [
    'You are a helpful AI assistant. The user\'s current web page content is provided below. You MUST use this content to answer their questions.',
    '',
    '<page_content>',
    `  <title>${pageValues.page_title}</title>`,
    `  <url>${pageValues.page_url}</url>`,
    pageValues.page_content,
    '</page_content>',
    '',
    'IMPORTANT: Answer based on the page content above. Do not say you cannot access the page — the content has already been provided to you.',
    '',
    'Guidelines:',
    '- Be concise and helpful in your responses',
    '- Reference specific parts of the page content when relevant',
    '- If it\'s a general question, try to answer based on your general knowledge',
    '- When summarizing, highlight the most important information first'
  ].join('\n');
}
