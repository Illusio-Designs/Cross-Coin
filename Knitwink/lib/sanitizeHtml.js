import DOMPurify from 'isomorphic-dompurify';

/**
 * Shared HTML sanitiser for content authored via admin rich-text
 * editors (ReactQuill) that gets rendered with dangerouslySetInnerHTML.
 *
 * Use this everywhere you display:
 *   - product descriptions
 *   - blog post sections
 *   - FAQ answers
 *   - policy pages
 *   - section titles / banners
 *
 * Do NOT use for self-generated content (JSON-LD scripts, analytics
 * snippets) — those don't need DOMPurify because they're not
 * user-authored.
 *
 * Why isomorphic-dompurify (not plain dompurify):
 *   - Works in Server Components / generateMetadata where there's no DOM.
 *   - Falls back to jsdom on the server, native DOM in the browser.
 *
 * Two flavours:
 *   sanitizeRich(html)   — full prose: paragraphs, lists, links, images,
 *                          headings, blockquotes, tables, code.
 *   sanitizeInline(html) — single-line text: only formatting tags,
 *                          NO block elements, NO links.
 *
 * React-ready prop helpers:
 *   richHtml(html)   → { dangerouslySetInnerHTML: { __html: ... } }
 *   inlineHtml(html) → same, with the inline allowlist
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

// Convenience: returns the React prop directly.
//   <div {...richHtml(post.body)} />
export function richHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeRich(html) } };
}

export function inlineHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeInline(html) } };
}

// Browser-only: harden external links inside sanitised content
// (target=_blank + rel=noopener, lazy-load images). Call once from
// the root client provider. Idempotent.
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
