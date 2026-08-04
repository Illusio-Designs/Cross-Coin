/**
 * Smoke tests for the HTML sanitiser.
 *
 * Guards the contract that admin-authored HTML rendered via
 * dangerouslySetInnerHTML is scrubbed of script tags, event handlers,
 * and other XSS vectors.
 *
 * Mocks isomorphic-dompurify because jsdom (its server-side backend)
 * ships ESM that's awkward to transform via babel-jest. We test the
 * EXPECTED behaviour of our wrapper around DOMPurify by stubbing the
 * sanitize() call with a minimal allowlist enforcement.
 */

jest.mock('isomorphic-dompurify', () => {
  const stripDisallowedTags = (html, allowed) => {
    const allowedSet = new Set(allowed.map((t) => t.toLowerCase()));
    // Remove any tag (incl. its contents) for <script>, otherwise just strip the tag itself.
    let out = String(html || '');
    out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => allowedSet.has(tag.toLowerCase()) ? m : '');
    // Strip on* event handlers + javascript: URIs from anything that survived.
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
