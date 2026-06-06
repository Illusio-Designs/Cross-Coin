/**
 * Smoke tests for the HTML sanitiser. See Knitwink's version for the
 * full rationale on the isomorphic-dompurify stub.
 */

jest.mock('isomorphic-dompurify', () => {
  const stripDisallowedTags = (html, allowed) => {
    const allowedSet = new Set(allowed.map((t) => t.toLowerCase()));
    let out = String(html || '');
    out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => allowedSet.has(tag.toLowerCase()) ? m : '');
    out = out.replace(/\son\w+="[^"]*"/gi, '');
    out = out.replace(/href="javascript:[^"]*"/gi, 'href="#"');
    return out;
  };
  return {
    __esModule: true,
    default: {
      sanitize: (html, opts = {}) => stripDisallowedTags(html, opts.ALLOWED_TAGS || []),
      addHook: () => {},
    },
  };
});

import { sanitizeRich, sanitizeInline, richHtml, inlineHtml } from '@/lib/sanitizeHtml';

describe('sanitizeHtml', () => {
  test('sanitizeRich strips <script>', () => {
    const out = sanitizeRich('<p>Hello <script>alert(1)</script>world</p>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<p>/i);
  });

  test('sanitizeRich strips inline event handlers', () => {
    const out = sanitizeRich('<a href="/x" onclick="alert(1)">click</a>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toMatch(/href/);
  });

  test('sanitizeRich strips javascript: URLs', () => {
    const out = sanitizeRich('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  test('sanitizeRich allows safe formatting tags', () => {
    const out = sanitizeRich('<p>Hello <strong>world</strong> and <em>everyone</em></p>');
    expect(out).toMatch(/<p>/);
    expect(out).toMatch(/<strong>/);
    expect(out).toMatch(/<em>/);
  });

  test('sanitizeInline strips block elements', () => {
    const out = sanitizeInline('<p>blocked</p><strong>kept</strong>');
    expect(out).not.toMatch(/<p>/);
    expect(out).toMatch(/<strong>/);
  });

  test('sanitizeInline strips anchors entirely (no <a> in inline allowlist)', () => {
    const out = sanitizeInline('<a href="/x">link</a>');
    expect(out).not.toMatch(/<a/);
  });

  test('richHtml returns a React-ready prop object', () => {
    const prop = richHtml('<p>safe</p>');
    expect(prop).toHaveProperty('dangerouslySetInnerHTML');
    expect(prop.dangerouslySetInnerHTML.__html).toMatch(/<p>/);
  });

  test('inlineHtml handles null/undefined safely', () => {
    expect(inlineHtml(null).dangerouslySetInnerHTML.__html).toBe('');
    expect(inlineHtml(undefined).dangerouslySetInnerHTML.__html).toBe('');
  });
});
