import DOMPurify from 'dompurify';

/**
 * Shared HTML sanitizer for any content authored via admin rich-text
 * editors (ReactQuill) that gets rendered with dangerouslySetInnerHTML.
 *
 * Use this everywhere you display:
 *   - product descriptions
 *   - blog post sections
 *   - FAQ answers
 *   - policy pages
 *   - coupon descriptions
 *   - WhatsApp template body text
 *
 * It does NOT apply to self-generated content (JSON-LD scripts,
 * analytics snippets) — those don't need DOMPurify because they're
 * not user-authored.
 *
 * Browser-only: DOMPurify needs a DOM. On SSR we strip tags so the
 * initial HTML stays searchable + safe; hydration re-renders the
 * sanitized rich version.
 *
 * Two flavors:
 *   sanitizeRich(html)  — full prose: paragraphs, lists, links, images,
 *                          headings, blockquotes, tables, code
 *   sanitizeInline(html) — single-line text: only formatting tags,
 *                          NO block elements, NO links
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

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function sanitizeRich(html) {
  if (typeof window === 'undefined') return stripTags(html);
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: RICH_ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_ALLOWED_ATTR,
    // Force every link to open safely. DOMPurify can't add attrs by itself;
    // we attach a hook that adds target=_blank + rel=noopener for external links.
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeInline(html) {
  if (typeof window === 'undefined') return stripTags(html);
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: INLINE_ALLOWED_TAGS,
    ALLOWED_ATTR: INLINE_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

// Convenience wrappers that return the React-ready prop directly.
// Usage: <div {...richHtml(product.description)} />
export function richHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeRich(html) } };
}

export function inlineHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeInline(html) } };
}

// Browser-only one-time hook to harden external links inside sanitized
// content. Call once from _app.jsx; idempotent.
let hookInstalled = false;
export function installLinkHardening() {
  if (typeof window === 'undefined' || hookInstalled) return;
  try {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        const href = node.getAttribute('href');
        // External link → open in new tab + harden rel
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
  } catch { /* DOMPurify not available — skip */ }
}
