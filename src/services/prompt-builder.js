/**
 * Prompt builder service for constructing prompts from templates.
 * Templates are inlined at build time.
 * @module services/prompt-builder
 */

import systemPromptTemplate from '../prompts/system-prompt.txt';
import chatTemplate from '../prompts/chat-template.txt';

/**
 * Replaces all {{placeholder}} tokens in a template with values.
 * @param {string} template - The template string with placeholders
 * @param {Object} values - Key-value pairs for replacement
 * @returns {string} The template with placeholders replaced
 */
function replacePlaceholders(template, values) {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value || '');
  }

  return result;
}

/**
 * Formats page content for the template.
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
 * Formats a message attachment reference for display in history.
 * Only shows title, not content (content is in current page context).
 * @param {Object} attachment - The page attachment (title, url only)
 * @returns {string} Formatted attachment reference
 */
function formatAttachmentRef(attachment) {
  if (!attachment) return '';
  return `[Attached: ${attachment.title || 'Page'}]`;
}

/**
 * Formats conversation history for the template.
 * Shows attachment references (title only) - actual content is in page context.
 * @param {Array} messages - Array of message objects with role, content, and optional attachment
 * @returns {string} Formatted history string
 */
function formatHistory(messages) {
  if (!messages || messages.length === 0) {
    return '[No previous conversation]';
  }

  return messages
    .map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      let text = `${role}: ${msg.content}`;

      // Show attachment reference (title only, not content)
      if (msg.attachment) {
        const ref = formatAttachmentRef(msg.attachment);
        text = `${role}: ${ref} ${msg.content}`;
      }

      return text;
    })
    .join('\n\n');
}

/**
 * Builds a chat prompt from the template.
 * @param {string} userMessage - The current user message
 * @param {Object} [pageContent] - The page content object (optional)
 * @param {Array} [messages] - Conversation history (optional)
 * @returns {string} The complete prompt
 */
export function buildChatPrompt(userMessage, pageContent = null, messages = []) {
  const pageValues = formatPageContent(pageContent);
  const historyText = formatHistory(messages);

  const values = {
    system_prompt: systemPromptTemplate.trim(),
    page_title: pageValues.page_title,
    page_url: pageValues.page_url,
    page_content: pageValues.page_content,
    history: historyText,
    user_message: userMessage
  };

  const prompt = replacePlaceholders(chatTemplate, values);

  console.log('[Prompt Builder] Built prompt with placeholders:', Object.keys(values).join(', '));
  console.log(`[Prompt Builder] Final prompt length: ${prompt.length} chars`);

  return prompt;
}

/**
 * Gets the raw system prompt template.
 * @returns {string} The system prompt
 */
export function getSystemPrompt() {
  return systemPromptTemplate.trim();
}

/**
 * Gets the raw chat template.
 * @returns {string} The chat template
 */
export function getChatTemplate() {
  return chatTemplate;
}
