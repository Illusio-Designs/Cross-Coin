import DOMPurify from 'isomorphic-dompurify';

/**
 * Shared HTML sanitiser for content authored via admin rich-text
 * editors (ReactQuill) that gets rendered with dangerouslySetInnerHTML.
 *
 * Use this everywhere you display:
 *   - product descriptions
 *   - blog post sections
 *   - policy pages
 *   - banners / section titles
 *
 * Self-generated content (JSON-LD scripts, analytics snippets,
 * bootstrap scripts) does NOT need DOMPurify — they're not
 * user-authored.
 *
 * Two flavours:
 *   sanitizeRich(html)   — full prose
 *   sanitizeInline(html) — formatting tags only, NO block / NO links
 */

const RICH_ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ol', 'ul', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const RICH_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'id', 'style',
];

const INLINE_ALLOWED_TAGS = [
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'span', 'br',
];

const INLINE_ALLOWED_ATTR = ['class', 'style'];

export function sanitizeRich(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: RICH_ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeInline(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: INLINE_ALLOWED_TAGS,
    ALLOWED_ATTR: INLINE_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function richHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeRich(html) } };
}

export function inlineHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeInline(html) } };
}

let hookInstalled = false;
export function installLinkHardening() {
  if (typeof window === 'undefined' || hookInstalled) return;
  try {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        const href = node.getAttribute('href');
        if (/^https?:\/\//i.test(href)) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
      if (node.tagName === 'IMG' && !node.getAttribute('loading')) {
        node.setAttribute('loading', 'lazy');
      }
    });
    hookInstalled = true;
  } catch { /* ignore */ }
}
