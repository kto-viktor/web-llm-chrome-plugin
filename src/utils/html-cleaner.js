/**
 * HTML cleaning utilities for extracting readable text from web pages.
 * @module utils/html-cleaner
 */

/**
 * Elements that should be completely removed (including content).
 */
const REMOVE_ELEMENTS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'video',
  'audio',
  'embed',
  'object',
  'template',
  'head'
];

/**
 * Elements that typically don't contain meaningful content.
 */
const SKIP_ELEMENTS = [
  'nav',
  'footer',
  'header',
  'aside',
  'menu',
  'menuitem'
];

/**
 * Removes script, style, and other non-content elements from HTML.
 * @param {string} html - The HTML string to clean
 * @returns {string} HTML with script/style elements removed
 */
export function removeNonContentElements(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let result = html;

  for (const tag of REMOVE_ELEMENTS) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    result = result.replace(regex, '');

    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = result.replace(selfClosingRegex, '');
  }

  return result;
}

/**
 * Strips all HTML tags from a string, preserving text content.
 * @param {string} html - The HTML string to strip
 * @returns {string} Plain text without HTML tags
 */
export function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z0-9#]+;/g, ' ');
}

/**
 * Extracts readable text from an HTML document.
 * Removes scripts, styles, and HTML tags, then normalizes whitespace.
 * @param {string} html - The full HTML document
 * @returns {string} Clean, readable text
 */
export function extractReadableText(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let cleaned = removeNonContentElements(html);
  cleaned = stripHtmlTags(cleaned);

  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();

  return cleaned;
}

/**
 * Cleans HTML from a DOM element (for use in content scripts).
 * @param {Element} element - The DOM element to extract text from
 * @returns {string} Clean, readable text
 */
export function extractTextFromElement(element) {
  if (!element) {
    return '';
  }

  const clone = element.cloneNode(true);

  for (const tag of [...REMOVE_ELEMENTS, ...SKIP_ELEMENTS]) {
    const elements = clone.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  }

  const text = clone.textContent || clone.innerText || '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
