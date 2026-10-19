import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { Extension, generateHTML, generateJSON } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TextBoldIcon, TextItalicIcon, TextUnderlineIcon, LeftToRightListBulletIcon, LeftToRightListNumberIcon,
  Link01Icon, Image02Icon, Table01Icon, TextClearIcon, UndoIcon, RedoIcon, ArrowExpandIcon, ArrowShrinkIcon,
  HighlighterIcon, Delete02Icon, Cancel01Icon, Upload04Icon, Alert02Icon, ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { productService, brandService } from '../../services';
import { sanitizeRich } from '../../utils/sanitizeHtml';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const IK_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';

/* ------------------------------------------------------------------------ */
/* Output contract                                                           */
/* ------------------------------------------------------------------------ */

// Image node that keeps a per-image `class`, so an image can be tagged
// desktop-only / mobile-only. The storefronts show/hide the matching one at each
// breakpoint via `.*-desc-rich .only-desktop` / `.only-mobile` CSS. Without this
// the Tiptap Image extension drops any class other than its fixed HTMLAttributes.
// Emits e.g. <img src="…" alt="…" class="rte-img only-mobile"> — do not change.
const ResponsiveImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'rte-img',
        parseHTML: (el) => el.getAttribute('class') || 'rte-img',
        renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
      },
    };
  },
});

const SHOW_CLASSES = ['rte-img', 'only-desktop', 'only-mobile'];
const showOf = (cls = '') => (/\bonly-desktop\b/.test(cls) ? 'desktop' : /\bonly-mobile\b/.test(cls) ? 'mobile' : 'both');
const classFor = (show, prev = '') => {
  const extra = String(prev || '').split(/\s+/).filter((c) => c && !SHOW_CLASSES.includes(c));
  return ['rte-img', ...(show === 'both' ? [] : [`only-${show}`]), ...extra].join(' ');
};

// Same-store links open in the same tab; every other site opens in a new tab
// with rel=noopener. Decided when the HTML is written, from the href, so typed,
// pasted and auto-linked URLs all follow the same rule.
const EXTERNAL_REL = 'noopener noreferrer nofollow';
const StoreLink = Link.extend({
  addOptions() {
    return { ...this.parent?.(), isSameStore: () => false };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      target: { default: null, renderHTML: () => ({}) },
      rel: { default: null, renderHTML: () => ({}) },
    };
  },
  renderHTML(props) {
    const out = this.parent(props);
    const { target, rel, ...rest } = out[1];
    // Same attribute order as the previous editor (target, rel, href) so
    // untouched external links serialise byte-for-byte as before.
    const attrs = rest.href && !this.options.isSameStore(rest.href)
      ? { target: '_blank', rel: EXTERNAL_REL, ...rest } : rest;
    return ['a', attrs, 0];
  },
});

// Plain <table><tbody>… without the colgroup / inline min-width Tiptap adds.
const PlainTable = Table.extend({
  renderHTML({ HTMLAttributes }) {
    return ['table', HTMLAttributes, ['tbody', 0]];
  },
});

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

// Resolve an uploaded image path to a full URL.
function resolveMediaUrl(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  return `${API_URL}/uploads/products/${path.replace(/^\/+/, '')}`;
}

// Photos-library paths (same rules as the Media gallery page).
function libraryUrl(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  if (/^\/(products|categories|sliders)/.test(path)) return `${IK_URL}${path}`;
  return `${IK_URL}/products/${path.replace(/^\/+/, '')}`;
}

// Pull the first uploaded image URL/path out of the upload response. The product
// upload endpoint (/api/products/upload-images) returns `uploadedImages: [{ url,
// path, … }]`; `url` is the full ImageKit CDN URL, so prefer it over `path`.
function extractUploadedPath(result) {
  const cand = result?.uploadedImages || result?.images || result?.data || result?.urls
    || result?.results || result?.uploaded || result?.files;
  const first = Array.isArray(cand) ? cand[0] : cand;
  if (!first) return null;
  if (typeof first === 'string') return first;
  return first.url || first.image_url || first.path || first.src || first.location || null;
}

const hostOf = (s) => String(s || '').trim().toLowerCase()
  .replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0];

// Brand storefront domains, fetched once per page load and shared by every editor.
const brandHosts = new Set();
let brandHostsPromise = null;
function loadBrandHosts() {
  if (!brandHostsPromise) {
    brandHostsPromise = brandService.getAllBrands(true)
      .then((r) => { (r?.data || []).forEach((b) => { const h = hostOf(b?.domain); if (h) brandHosts.add(h); }); })
      .catch(() => {});
  }
  return brandHostsPromise;
}

function makeIsSameStore(extraRef) {
  return (href) => {
    const h = String(href || '').trim();
    if (!h) return true;
    if (/^(mailto:|tel:|#|\?)/i.test(h)) return true;
    if (h.startsWith('/') && !h.startsWith('//')) return true;
    if (!/^([a-z]+:)?\/\//i.test(h)) return true; // relative path
    const host = hostOf(h);
    const extra = (extraRef.current || []).map(hostOf);
    return brandHosts.has(host) || extra.includes(host);
  };
}

function normaliseHref(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^\s*(javascript|data|vbscript):/i.test(v)) return '';
  if (/^(https?:|mailto:|tel:|\/|#|\?)/i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) return `https://${v}`;
  return v;
}

const ALT_FILENAME = /^[\w\-. ()]*\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;
const altMissing = (alt) => { const a = String(alt || '').trim(); return !a || a.toLowerCase() === 'image' || ALT_FILENAME.test(a); };

// Strip what shouldn't survive HTML mode: scripts, on* handlers (DOMPurify via
// the shared sanitizeRich) and inline styles.
function cleanSourceHtml(html) {
  const safe = sanitizeRich(html || '');
  if (typeof window === 'undefined' || !window.DOMParser) return safe;
  const doc = new window.DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  doc.body.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); });
  });
  return doc.body.innerHTML;
}
const hadUnsafeBits = (html) => /<script|\son\w+\s*=|\sstyle\s*=/i.test(html || '');

// Paste cleanup (Word / Google Docs): keep headings, lists, links, bold, italic,
// underline, tables and images; drop fonts, colours, classes and styles.
function cleanPastedHtml(html, allowImages) {
  if (typeof window === 'undefined' || !window.DOMParser) return html;
  const doc = new window.DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const unwrap = (el) => { el.replaceWith(...el.childNodes); };
  const rename = (el, tag) => { const n = doc.createElement(tag); n.append(...el.childNodes); el.replaceWith(n); return n; };

  body.querySelectorAll('script,style,meta,link,title,xml,iframe,object,embed,noscript').forEach((el) => el.remove());
  const walker = doc.createTreeWalker(body, 128 /* comments */);
  const comments = []; while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
  [...body.getElementsByTagName('*')].forEach((el) => { if (el.tagName.includes(':')) unwrap(el); });

  // Word list paragraphs → real lists.
  [...body.querySelectorAll('p')].forEach((p) => {
    const st = (p.getAttribute('style') || '') + ' ' + (p.getAttribute('class') || '');
    if (!/mso-list|MsoListParagraph/i.test(st)) return;
    let marker = '';
    p.querySelectorAll('[style]').forEach((s) => {
      if (/mso-list:\s*ignore/i.test(s.getAttribute('style'))) { marker += s.textContent; s.remove(); }
    });
    p.setAttribute('data-ed-list', /^\s*(\d+|[a-z]|[ivx]+)[.)]/i.test(marker) ? 'ol' : 'ul');
  });
  [...body.querySelectorAll('p[data-ed-list]')].forEach((p) => {
    if (!p.isConnected || !p.hasAttribute('data-ed-list')) return;
    const kind = p.getAttribute('data-ed-list');
    const list = doc.createElement(kind);
    p.before(list);
    let cur = p;
    while (cur && cur.nodeType === 1 && cur.getAttribute('data-ed-list') === kind) {
      const next = cur.nextElementSibling;
      const li = doc.createElement('li'); li.append(...cur.childNodes); list.append(li); cur.remove();
      cur = next;
    }
  });

  // Inline styles that carry meaning → semantic tags, before styles are dropped.
  [...body.querySelectorAll('span[style],font[style]')].forEach((el) => {
    const st = el.getAttribute('style') || '';
    let inner = el;
    const wrap = (tag) => { const w = doc.createElement(tag); w.append(...inner.childNodes); inner.append(w); inner = w; };
    if (/font-weight:\s*(bold|[6-9]00)/i.test(st)) wrap('strong');
    if (/font-style:\s*italic/i.test(st)) wrap('em');
    if (/text-decoration[^;]*underline/i.test(st)) wrap('u');
  });
  // Google Docs wraps the whole clipboard in <b style="font-weight:normal" id="docs-internal-guid-…">.
  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap);
  [...body.querySelectorAll('b')].forEach((b) => { if (/font-weight:\s*(normal|[1-4]00)/i.test(b.getAttribute('style') || '')) unwrap(b); });

  body.querySelectorAll('h1').forEach((h) => rename(h, 'h2'));
  body.querySelectorAll('h4,h5,h6').forEach((h) => rename(h, 'h3'));
  body.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!allowImages || !src || src.startsWith('data:') || src.startsWith('file:')) img.remove();
  });
  [...body.querySelectorAll('font,span,div')].forEach((el) => {
    if (el.tagName === 'DIV') { if (!el.querySelector('p,h2,h3,ul,ol,table,blockquote')) rename(el, 'p'); else unwrap(el); } else unwrap(el);
  });

  const KEEP = { A: ['href'], IMG: ['src', 'alt', 'class'], TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'] };
  body.querySelectorAll('*').forEach((el) => {
    const keep = KEEP[el.tagName] || [];
    [...el.attributes].forEach((a) => { if (!keep.includes(a.name)) el.removeAttribute(a.name); });
    if (el.tagName === 'IMG') el.setAttribute('class', classFor(showOf(el.getAttribute('class') || '')));
  });
  return body.innerHTML;
}

// One block per line for the HTML view.
const prettyHtml = (html) => String(html || '')
  .replace(/(<\/(p|h[1-6]|ul|ol|blockquote|table|tr)>|<hr>|<img[^>]*>)(?!\n)/g, '$1\n').trim();

function countWords(text) {
  const m = String(text || '').trim().match(/\S+/g);
  return m ? m.length : 0;
}

function computeIssues(doc, headingBase) {
  let noAlt = 0; let skipped = 0; let prev = headingBase;
  doc.descendants((node) => {
    if (node.type.name === 'image' && altMissing(node.attrs.alt)) noAlt += 1;
    if (node.type.name === 'heading') {
      const lvl = node.attrs.level;
      if (lvl > prev + 1) skipped += 1;
      prev = lvl;
    }
  });
  const issues = [];
  if (noAlt) issues.push({ code: 'image-alt', count: noAlt, message: `${noAlt} image${noAlt > 1 ? 's have' : ' has'} no description` });
  if (skipped) issues.push({ code: 'heading-skip', count: skipped, message: `${skipped} heading${skipped > 1 ? 's skip' : ' skips'} a level (a small heading with no heading above it)` });
  return issues;
}

const SIZE_CHART_HTML = '<table><tbody>'
  + '<tr><th><p>Size</p></th><th><p>UK</p></th><th><p>EU</p></th><th><p>Foot length (cm)</p></th></tr>'
  + ['S', 'M', 'L', 'XL'].map((s) => `<tr><td><p>${s}</p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>`).join('')
  + '</tbody></table><p></p>';
const FAQ_Q = 'Write the question here';
const FAQ_A = 'Write the answer here.';

const SLASH_ITEMS = [
  { id: 'h2', t: 'Heading', d: 'Big section title', k: 'heading title h2' },
  { id: 'h3', t: 'Small heading', d: 'Sub-section title', k: 'small heading subheading h3' },
  { id: 'ul', t: 'Bulleted list', d: 'List with dots', k: 'bulleted bullet list ul' },
  { id: 'ol', t: 'Numbered list', d: '1, 2, 3 steps', k: 'numbered ordered list ol' },
  { id: 'img', t: 'Image', d: 'From Photos or upload', k: 'image photo picture', img: true },
  { id: 'table', t: 'Table', d: 'Rows and columns', k: 'table grid' },
  { id: 'size', t: 'Size chart', d: 'Table with UK / EU sizes', k: 'size chart table' },
  { id: 'faq', t: 'FAQ', d: 'Question and answer', k: 'faq question answer' },
  { id: 'quote', t: 'Quote', d: 'Highlighted quote', k: 'quote blockquote' },
  { id: 'hr', t: 'Divider', d: 'A thin line', k: 'divider line rule hr' },
];
const INSERT_ITEMS = ['img', 'table', 'size', 'faq', 'quote', 'hr'];

const Icon = ({ icon, size = 16 }) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />;

/**
 * Shared rich-text editor (Tiptap / ProseMirror) for product descriptions,
 * blog sections, policies and FAQ answers.
 *
 * Props (all backward compatible):
 *  - value (HTML string), onChange(html) — '' for an empty document
 *  - placeholder, allowImages (default true) — false hides every image control
 *  - onIssues(issues[]) — optional; called when the "checks before saving" list
 *    changes: [{ code: 'image-alt' | 'heading-skip', count, message }]
 *  - storeHosts — optional extra hostnames treated as "this store" for links
 *    (brand domains are loaded automatically)
 *  - headingBase (default 1) — heading level of the page title around this text
 *  - showChecks (default true) — show the checks strip under the editor
 *  - any other props are spread on the root element (as before)
 */
const Editor = ({
  value, onChange, placeholder = 'Start typing...', allowImages = true,
  onIssues, storeHosts, headingBase = 1, showChecks = true, className, ...props
}) => {
  const [mode, setMode] = useState('write');
  const [device, setDevice] = useState('desktop');
  const [sourceHtml, setSourceHtml] = useState('');
  const [panel, setPanel] = useState(null); // { type: 'link' } | { type: 'image', replace }
  const [insertOpen, setInsertOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [slash, setSlash] = useState(null); // { query, from, to, top, left, index }
  const [imgBox, setImgBox] = useState(null);
  const [, force] = useState(0);

  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const altInputRef = useRef(null);
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const onIssuesRef = useRef(onIssues); onIssuesRef.current = onIssues;
  const storeHostsRef = useRef(storeHosts); storeHostsRef.current = storeHosts;
  const modeRef = useRef(mode); modeRef.current = mode;
  const slashRef = useRef(slash); slashRef.current = slash;
  const slashDismissRef = useRef(null);
  const uploadInsertRef = useRef(null);
  const openLinkRef = useRef(null);
  const runSlashRef = useRef(null);
  const allowImagesRef = useRef(allowImages); allowImagesRef.current = allowImages;
  const isSameStore = useMemo(() => makeIsSameStore(storeHostsRef), []);

  useEffect(() => { loadBrandHosts(); }, []);

  const imageFileFromEvent = (list) => {
    if (!list) return null;
    for (const item of list) {
      const type = item.type || '';
      if (type.startsWith('image/')) return typeof item.getAsFile === 'function' ? item.getAsFile() : item;
    }
    return null;
  };

  const detectSlash = (ed) => {
    const { selection } = ed.state;
    const close = () => { if (slashRef.current) setSlash(null); };
    if (modeRef.current !== 'write' || !selection.empty || !(selection instanceof TextSelection)) return close();
    const { $from } = selection;
    if ($from.parent.type.name !== 'paragraph') return close();
    const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
    const m = /^\/([\w ]{0,24})$/.exec(before);
    if (!m) { slashDismissRef.current = null; return close(); }
    const from = $from.start();
    if (slashDismissRef.current === from) return close();
    let top = 0; let left = 0;
    try {
      const c = ed.view.coordsAtPos(selection.from);
      const r = bodyRef.current?.getBoundingClientRect();
      if (r) { top = c.bottom - r.top + 6; left = Math.max(8, Math.min(c.left - r.left, r.width - 280)); }
    } catch { /* not laid out (tests) */ }
    const prev = slashRef.current;
    setSlash({ query: m[1].toLowerCase(), from, to: selection.from, top, left, index: prev && prev.query === m[1].toLowerCase() ? prev.index : 0 });
  };

  const LinkShortcut = useMemo(() => Extension.create({
    name: 'edShortcuts',
    addKeyboardShortcuts() {
      return { 'Mod-k': () => { openLinkRef.current?.(); return true; } };
    },
  }), []);

  const editor = useEditor({
    // Render on the client only (Next.js SSR).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Highlight,
      StoreLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: null, rel: null, class: null },
        isSameStore,
      }),
      Placeholder.configure({ placeholder }),
      ResponsiveImage.configure({ inline: false }),
      PlainTable.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      LinkShortcut,
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'ed-doc', role: 'textbox', 'aria-multiline': 'true', 'aria-label': placeholder },
      transformPastedHTML: (html) => cleanPastedHtml(html, allowImagesRef.current),
      // Pasted / dropped image files are uploaded instead of being inlined as
      // base64 (which bloats the saved JSON and caused 413 errors).
      handlePaste: (view, event) => {
        if (!allowImagesRef.current) return false;
        const file = imageFileFromEvent(event.clipboardData?.items);
        if (file) { event.preventDefault(); uploadInsertRef.current?.(file); return true; }
        return false;
      },
      handleDrop: (view, event) => {
        if (!allowImagesRef.current) return false;
        const file = imageFileFromEvent(event.dataTransfer?.files);
        if (file) { event.preventDefault(); uploadInsertRef.current?.(file); return true; }
        return false;
      },
      handleKeyDown: (view, event) => {
        const s = slashRef.current;
        if (!s) return false;
        const items = runSlashRef.current?.items || [];
        if (event.key === 'Escape') { slashDismissRef.current = s.from; setSlash(null); return true; }
        if (!items.length) return false;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const d = event.key === 'ArrowDown' ? 1 : -1;
          setSlash({ ...s, index: (s.index + d + items.length) % items.length });
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          runSlashRef.current?.run(items[Math.min(s.index, items.length - 1)].id);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      detectSlash(ed);
      if (!onChangeRef.current) return;
      const html = ed.getHTML();
      onChangeRef.current(html === '<p></p>' ? '' : html);
    },
    onSelectionUpdate: ({ editor: ed }) => detectSlash(ed),
  });

  // Push external value changes (e.g. loading a post to edit) into the editor
  // without emitting an update. Skipped in HTML mode so it doesn't clobber typing.
  useEffect(() => {
    if (!editor || mode === 'html') return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current && !(next === '' && current === '<p></p>')) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor, mode]);

  // Checks before saving.
  const issues = editor ? computeIssues(editor.state.doc, headingBase) : [];
  const issuesKey = JSON.stringify(issues);
  useEffect(() => {
    if (editor) onIssuesRef.current?.(JSON.parse(issuesKey));
  }, [issuesKey, editor]);

  // Image block toolbar position (under the selected image).
  const selectedImage = editor && editor.state.selection instanceof NodeSelection
    && editor.state.selection.node.type.name === 'image' ? editor.state.selection : null;
  useLayoutEffect(() => {
    if (!editor || !selectedImage || mode !== 'write') { if (imgBox) setImgBox(null); return; }
    const dom = editor.view.nodeDOM(selectedImage.from);
    const body = bodyRef.current;
    if (!dom || !body) return;
    const place = () => {
      const r = dom.getBoundingClientRect(); const b = body.getBoundingClientRect();
      const box = { top: Math.round(r.bottom - b.top + 6), left: Math.round(Math.max(8, r.left - b.left)) };
      setImgBox((p) => (p && p.top === box.top && p.left === box.left ? p : box));
    };
    place();
    if (dom.tagName === 'IMG' && !dom.complete) dom.addEventListener('load', place, { once: true });
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); dom.removeEventListener?.('load', place); };
  });

  // Full screen: Esc exits, page behind doesn't scroll.
  useEffect(() => {
    if (!full) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [full]);

  // Close the Insert menu on outside click.
  useEffect(() => {
    if (!insertOpen) return undefined;
    const onDoc = (e) => { if (!e.target.closest?.('.ed-insert')) setInsertOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [insertOpen]);

  /* ---------------------------- editing helpers --------------------------- */

  // Insert block content: replace the current empty paragraph, else insert
  // after the selection (never replaces a selected image).
  const insertBlock = useCallback((content) => {
    if (!editor) return 0;
    const { selection } = editor.state;
    const { $from } = selection;
    let at = selection.to;
    if (selection.empty && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0 && $from.depth > 0) {
      at = { from: $from.before(), to: $from.after() };
    }
    editor.chain().focus().insertContentAt(at, content).run();
    return typeof at === 'number' ? at : at.from;
  }, [editor]);

  const findNear = (pred, near) => {
    let best = null;
    editor.state.doc.descendants((node, pos) => {
      if (pred(node) && (best === null || Math.abs(pos - near) < Math.abs(best - near))) best = pos;
    });
    return best;
  };

  const insertImage = (src, alt, show) => {
    const at = insertBlock({ type: 'image', attrs: { src, alt: alt || '', class: classFor(show) } });
    const pos = findNear((n) => n.type.name === 'image' && n.attrs.src === src, at);
    if (pos !== null) editor.chain().setNodeSelection(pos).run();
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setNotice(null);
    try {
      const result = await productService.uploadImages([file]);
      const src = resolveMediaUrl(extractUploadedPath(result));
      if (!src) setNotice('The photo uploaded but no link came back. Try again, or use “Paste a link”.');
      return src;
    } catch (err) {
      setNotice(`Photo upload failed${err?.message ? `: ${err.message}` : ''}. Try again, or use “Paste a link”.`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Pasted / dropped image → upload → insert, then select it so the image bar
  // asks for a description.
  uploadInsertRef.current = async (file) => {
    if (!file || !editor) return;
    const src = await uploadFile(file);
    if (src) { insertImage(src, '', 'both'); setTimeout(() => altInputRef.current?.focus(), 0); }
  };

  const openLink = () => { if (mode === 'write') { setPanel({ type: 'link', key: Date.now() }); setInsertOpen(false); } };
  openLinkRef.current = openLink;
  const openImage = (replace = false) => { if (allowImages) { setPanel({ type: 'image', replace, key: Date.now() }); setInsertOpen(false); } };

  const insertFaq = () => {
    const at = insertBlock(`<h3>${FAQ_Q}</h3><p>${FAQ_A}</p>`);
    const pos = findNear((n) => n.type.name === 'heading' && n.textContent === FAQ_Q, at);
    if (pos !== null) editor.chain().focus().setTextSelection({ from: pos + 1, to: pos + 1 + FAQ_Q.length }).run();
  };

  const runBlock = (id) => {
    const c = () => editor.chain().focus();
    switch (id) {
      case 'h2': c().setHeading({ level: 2 }).run(); break;
      case 'h3': c().setHeading({ level: 3 }).run(); break;
      case 'ul': c().toggleBulletList().run(); break;
      case 'ol': c().toggleOrderedList().run(); break;
      case 'quote': c().setParagraph().setBlockquote().run(); break;
      case 'hr': c().setHorizontalRule().run(); break;
      case 'table': c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'size': insertBlock(SIZE_CHART_HTML); break;
      case 'faq': insertFaq(); break;
      case 'img': openImage(false); break;
      default:
    }
  };

  const slashItems = slash ? SLASH_ITEMS.filter((it) => (allowImages || !it.img)
    && (!slash.query || it.t.toLowerCase().includes(slash.query) || it.k.includes(slash.query))) : [];
  runSlashRef.current = {
    items: slashItems,
    run: (id) => {
      const s = slashRef.current;
      if (!s || !editor) return;
      setSlash(null);
      editor.chain().focus().deleteRange({ from: s.from, to: s.to }).run();
      runBlock(id);
    },
  };

  /* --------------------------------- modes -------------------------------- */

  const normaliseThroughSchema = (html) => {
    try {
      const exts = editor.extensionManager.extensions;
      const out = generateHTML(generateJSON(html, exts), exts);
      return out === '<p></p>' ? '' : out;
    } catch { return html; }
  };

  const switchMode = (next) => {
    if (!editor || next === mode) return;
    setPanel(null); setInsertOpen(false); setSlash(null);
    if (mode === 'html') {
      const cleaned = cleanSourceHtml(sourceHtml);
      if (hadUnsafeBits(sourceHtml)) setNotice('Scripts, event handlers and inline styles were removed from the HTML.');
      editor.commands.setContent(cleaned, true);
    }
    if (next === 'html') {
      const html = editor.getHTML();
      setSourceHtml(prettyHtml(html === '<p></p>' ? '' : html));
    }
    setMode(next);
  };

  const onSourceChange = (e) => {
    const v = e.target.value;
    setSourceHtml(v);
    // Keep the parent's value current so saving straight from HTML mode works.
    onChangeRef.current?.(normaliseThroughSchema(cleanSourceHtml(v)));
  };

  if (!editor) {
    return <div className={`ed ed--loading${className ? ` ${className}` : ''}`} aria-busy="true" {...props} />;
  }

  /* -------------------------------- toolbar ------------------------------- */

  const textStyle = editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
      : editor.isActive('blockquote') ? 'quote' : 'p';
  const setTextStyle = (v) => {
    let c = editor.chain().focus();
    if (editor.isActive('blockquote') && v !== 'quote') c = c.unsetBlockquote();
    if (v === 'p') c.setParagraph().run();
    else if (v === 'h2') c.setHeading({ level: 2 }).run();
    else if (v === 'h3') c.setHeading({ level: 3 }).run();
    else if (v === 'quote' && !editor.isActive('blockquote')) c.setParagraph().setBlockquote().run();
  };

  const tools = [
    { id: 'bold', label: 'Bold (Ctrl+B)', icon: TextBoldIcon, on: () => editor.chain().focus().toggleBold().run(), pressed: editor.isActive('bold') },
    { id: 'italic', label: 'Italic (Ctrl+I)', icon: TextItalicIcon, on: () => editor.chain().focus().toggleItalic().run(), pressed: editor.isActive('italic') },
    { id: 'underline', label: 'Underline (Ctrl+U)', icon: TextUnderlineIcon, on: () => editor.chain().focus().toggleUnderline().run(), pressed: editor.isActive('underline') },
    { sep: true },
    { id: 'ul', label: 'Bulleted list', icon: LeftToRightListBulletIcon, on: () => editor.chain().focus().toggleBulletList().run(), pressed: editor.isActive('bulletList') },
    { id: 'ol', label: 'Numbered list', icon: LeftToRightListNumberIcon, on: () => editor.chain().focus().toggleOrderedList().run(), pressed: editor.isActive('orderedList') },
    { id: 'link', label: 'Link (Ctrl+K)', icon: Link01Icon, on: openLink, pressed: editor.isActive('link') },
    ...(allowImages ? [{ id: 'image', label: 'Image', icon: Image02Icon, on: () => openImage(false) }] : []),
    { id: 'table', label: 'Table', icon: Table01Icon, on: () => runBlock('table') },
    { id: 'clear', label: 'Clear formatting', icon: TextClearIcon, on: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
  ];

  // Arrow keys move between toolbar controls.
  const onToolbarKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (e.target.tagName === 'SELECT') return;
    const els = [...e.currentTarget.querySelectorAll('button:not(:disabled), select')];
    const i = els.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    els[(i + (e.key === 'ArrowRight' ? 1 : -1) + els.length) % els.length].focus();
  };

  const inTable = editor.isActive('table');
  const text = editor.getText();
  const words = countWords(text);
  const minutes = Math.max(1, Math.ceil(words / 200));

  const imgAttrs = selectedImage ? selectedImage.node.attrs : null;
  const imgShow = imgAttrs ? showOf(imgAttrs.class) : 'both';

  // Preview data.
  const previewHtml = mode === 'preview' ? sanitizeRich(editor.getHTML()) : '';
  let hiddenHere = 0;
  if (mode === 'preview') {
    editor.state.doc.descendants((n) => {
      if (n.type.name === 'image') {
        const s = showOf(n.attrs.class);
        if ((device === 'phone' && s === 'desktop') || (device === 'desktop' && s === 'mobile')) hiddenHere += 1;
      }
    });
  }

  const firstNoAlt = () => {
    let pos = null;
    editor.state.doc.descendants((n, p) => { if (pos === null && n.type.name === 'image' && altMissing(n.attrs.alt)) pos = p; });
    if (pos === null) return;
    if (mode !== 'write') switchMode('write');
    setTimeout(() => {
      editor.chain().focus().setNodeSelection(pos).scrollIntoView().run();
      setTimeout(() => altInputRef.current?.focus(), 0);
    }, 0);
  };

  const modes = [['write', 'Write'], ['preview', 'Preview'], ['html', 'HTML']];
  const rootClass = ['ed', full ? 'ed--full' : '', className || ''].filter(Boolean).join(' ');

  return (
    <div className={rootClass} ref={rootRef} {...props}>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; fileInputRef.current?.onPick?.(f); }} />

      <div className="ed-top">
        <div className="ed-modes" role="tablist" aria-label="Editor mode">
          {modes.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className={`ed-mode${mode === id ? ' is-on' : ''}`} onClick={() => switchMode(id)}>{label}</button>
          ))}
        </div>
        <span className="ed-stats" aria-live="polite">
          {uploading ? 'Uploading photo… · ' : ''}{words} {words === 1 ? 'word' : 'words'} · {minutes} min read
        </span>
      </div>

      {mode === 'write' && (
        <div className="ed-head">
          <div className="ed-toolbar" role="toolbar" aria-label="Formatting" onKeyDown={onToolbarKey}>
            <select className="ed-style" aria-label="Text style" value={textStyle} onChange={(e) => setTextStyle(e.target.value)}>
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Small heading</option>
              <option value="quote">Quote</option>
            </select>
            <span className="ed-sep" aria-hidden="true" />
            {tools.map((t, i) => (t.sep ? <span key={`s${i}`} className="ed-sep" aria-hidden="true" /> : (
              <button
                key={t.id} type="button" className={`ed-tool${t.pressed ? ' is-on' : ''}`}
                aria-label={t.label} title={t.label}
                {...(t.pressed !== undefined ? { 'aria-pressed': !!t.pressed } : {})}
                onMouseDown={(e) => e.preventDefault()} onClick={t.on}
              ><Icon icon={t.icon} /></button>
            )))}
            <span className="ed-sep" aria-hidden="true" />
            <div className="ed-insert">
              <button type="button" className="ed-insert-btn" aria-haspopup="menu" aria-expanded={insertOpen} onClick={() => setInsertOpen((o) => !o)}>
                + Insert <Icon icon={ArrowDown01Icon} size={14} />
              </button>
              {insertOpen && (
                <div className="ed-menu" role="menu" aria-label="Insert" onKeyDown={(e) => { if (e.key === 'Escape') setInsertOpen(false); }}>
                  {SLASH_ITEMS.filter((it) => INSERT_ITEMS.includes(it.id) && (allowImages || !it.img)).map((it) => (
                    <button key={it.id} type="button" role="menuitem" className="ed-menu-item" onClick={() => { setInsertOpen(false); runBlock(it.id); }}>
                      <b>{it.t}</b><span>{it.d}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="ed-end">
              <button type="button" className="ed-tool ed-tool--quiet" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()}><Icon icon={UndoIcon} /></button>
              <button type="button" className="ed-tool ed-tool--quiet" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()}><Icon icon={RedoIcon} /></button>
              <button type="button" className="ed-tool ed-tool--quiet" aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen (Esc)' : 'Full screen'} aria-pressed={full} onClick={() => setFull((f) => !f)}><Icon icon={full ? ArrowShrinkIcon : ArrowExpandIcon} /></button>
            </span>
          </div>

          {inTable && (
            <div className="ed-tablebar" role="toolbar" aria-label="Table">
              <span className="ed-tablebar-label">Table</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Column</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()}>− Row</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()}>− Column</button>
              <button type="button" className="is-danger" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()}>Remove table</button>
            </div>
          )}

          {panel?.type === 'link' && (
            <LinkPanel key={panel.key} editor={editor} isSameStore={isSameStore} onClose={() => { setPanel(null); editor.commands.focus(); }} />
          )}
          {panel?.type === 'image' && (
            <ImagePanel
              key={panel.key}
              replace={panel.replace}
              initial={panel.replace && imgAttrs ? { alt: imgAttrs.alt || '', show: imgShow } : { alt: '', show: 'both' }}
              uploading={uploading}
              fileInputRef={fileInputRef}
              uploadFile={uploadFile}
              onClose={() => setPanel(null)}
              onChoose={(src, alt, show) => {
                if (panel.replace && selectedImage) {
                  editor.chain().focus().updateAttributes('image', { src, alt, class: classFor(show, imgAttrs.class) }).run();
                } else {
                  insertImage(src, alt, show);
                }
                setPanel(null);
              }}
            />
          )}
        </div>
      )}

      {notice && (
        <div className="ed-notice" role="alert">
          <Icon icon={Alert02Icon} size={15} /><span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><Icon icon={Cancel01Icon} size={14} /></button>
        </div>
      )}

      <div className="ed-body" ref={bodyRef} hidden={mode !== 'write'}>
        <EditorContent editor={editor} />

        <BubbleMenu
          editor={editor}
          pluginKey="edBubble"
          className="ed-bubble"
          tippyOptions={{ duration: 100, placement: 'top', zIndex: 10002, maxWidth: 'none' }}
          shouldShow={({ editor: ed, state }) => {
            const sel = state.selection;
            if (modeRef.current !== 'write' || sel.empty || !(sel instanceof TextSelection)) return false;
            return !!state.doc.textBetween(sel.from, sel.to).trim() && ed.isEditable;
          }}
        >
          <div role="toolbar" aria-label="Selected text" className="ed-bubble-bar">
            <button type="button" aria-label="Bold" aria-pressed={editor.isActive('bold')} className={editor.isActive('bold') ? 'is-on' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><Icon icon={TextBoldIcon} size={15} /></button>
            <button type="button" aria-label="Italic" aria-pressed={editor.isActive('italic')} className={editor.isActive('italic') ? 'is-on' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><Icon icon={TextItalicIcon} size={15} /></button>
            <button type="button" aria-label="Link" aria-pressed={editor.isActive('link')} className={editor.isActive('link') ? 'is-on' : ''} onClick={openLink}><Icon icon={Link01Icon} size={15} /></button>
            <button type="button" aria-label="Highlight" aria-pressed={editor.isActive('highlight')} className={editor.isActive('highlight') ? 'is-on' : ''} onClick={() => editor.chain().focus().toggleHighlight().run()}><Icon icon={HighlighterIcon} size={15} /></button>
          </div>
        </BubbleMenu>

        {slash && slashItems.length > 0 && (
          <div className="ed-slash" role="listbox" aria-label="Insert block" style={{ top: slash.top, left: slash.left }}>
            {slashItems.map((it, i) => (
              <button
                key={it.id} type="button" role="option" aria-selected={i === slash.index}
                className={`ed-slash-item${i === slash.index ? ' is-on' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); runSlashRef.current.run(it.id); }}
              ><b>{it.t}</b><span>{it.d}</span></button>
            ))}
          </div>
        )}

        {selectedImage && allowImages && imgBox && (
          <div className="ed-imgbar" role="toolbar" aria-label="Selected image" style={{ top: imgBox.top, left: imgBox.left }}>
            <div className="ed-chips" role="group" aria-label="Show on">
              {[['desktop', 'Desktop only'], ['mobile', 'Phone only'], ['both', 'Both']].map(([id, label]) => (
                <button
                  key={id} type="button" aria-pressed={imgShow === id} className={`ed-chip${imgShow === id ? ' is-on' : ''}`}
                  onClick={() => editor.chain().updateAttributes('image', { class: classFor(id, imgAttrs.class) }).run()}
                >{label}</button>
              ))}
            </div>
            <label className={`ed-alt${altMissing(imgAttrs.alt) ? ' is-missing' : ''}`}>
              <span className="ed-visually-hidden">Image description (required)</span>
              <input
                ref={altInputRef}
                value={imgAttrs.alt || ''}
                placeholder="Describe the photo (required)"
                aria-required="true"
                aria-invalid={altMissing(imgAttrs.alt)}
                onChange={(e) => editor.chain().updateAttributes('image', { alt: e.target.value }).run()}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor.commands.focus(); } }}
              />
            </label>
            <button type="button" className="ed-btn" onClick={() => openImage(true)}>Replace</button>
            <button type="button" className="ed-btn ed-btn--danger" aria-label="Remove image" title="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()}><Icon icon={Delete02Icon} size={15} /></button>
          </div>
        )}
      </div>

      {mode === 'preview' && (
        <div className="ed-preview">
          <div className="ed-devices" role="group" aria-label="Screen size">
            {[['desktop', 'Desktop'], ['phone', 'Phone']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={device === id} className={`ed-mode${device === id ? ' is-on' : ''}`} onClick={() => setDevice(id)}>{label}</button>
            ))}
          </div>
          <div className={`ed-frame ed-frame--${device}`}>
            {/* eslint-disable-next-line react/no-danger */}
            <div className="ed-pv-doc" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="ed-pv-empty">Nothing written yet.</p>' }} />
          </div>
          {hiddenHere > 0 && (
            <span className="ed-pv-note">
              {hiddenHere} image{hiddenHere > 1 ? 's are' : ' is'} hidden on {device === 'phone' ? 'phones' : 'desktop'} (set to {device === 'phone' ? 'Desktop only' : 'Phone only'}).
            </span>
          )}
        </div>
      )}

      {mode === 'html' && (
        <div className="ed-html">
          <textarea
            className="ed-source" value={sourceHtml} spellCheck={false} aria-label="HTML"
            placeholder="Paste or edit HTML here."
            onChange={onSourceChange}
          />
          <span className="ed-html-note">Advanced: scripts and inline styles are removed when you leave this view or save.</span>
        </div>
      )}

      {showChecks && issues.length > 0 && (
        <div className="ed-checks" role="status">
          <Icon icon={Alert02Icon} size={15} />
          <span className="ed-checks-text">
            <b>Checks before saving:</b>{' '}
            {issues.map((it, i) => (
              <span key={it.code}>
                {i > 0 ? ' · ' : ''}{it.message}
                {it.code === 'image-alt' && allowImages && <> <button type="button" className="ed-linkbtn" onClick={firstNoAlt}>Show me</button></>}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------------ */
/* Link panel                                                                */
/* ------------------------------------------------------------------------ */

function LinkPanel({ editor, isSameStore, onClose }) {
  const existing = editor.getAttributes('link').href || '';
  const hasSelection = !editor.state.selection.empty;
  const [href, setHref] = useState(existing);
  const [label, setLabel] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const url = normaliseHref(href);
  const same = url ? isSameStore(url) : null;
  const needsLabel = !hasSelection && !existing;

  const save = (e) => {
    e?.preventDefault();
    if (!url) return;
    if (needsLabel) {
      editor.chain().focus().insertContent({ type: 'text', text: label.trim() || url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    onClose();
  };
  const remove = () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); };

  return (
    <div className="ed-panel" role="group" aria-label="Link" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } if (e.key === 'Enter' && e.target.tagName === 'INPUT') save(e); }}>
      <label className="ed-field">
        <span>Link to</span>
        <input ref={inputRef} value={href} onChange={(e) => setHref(e.target.value)} placeholder="/products/ankle-socks or https://…" inputMode="url" />
      </label>
      {needsLabel && (
        <label className="ed-field">
          <span>Text to show</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Size guide" />
        </label>
      )}
      <span className="ed-hint">
        {href && !url ? 'That link can’t be used.' : same === null ? 'Links to your own store open in the same tab; other sites open in a new tab.' : same ? 'Your store — opens in the same tab.' : 'Another site — opens in a new tab.'}
      </span>
      <div className="ed-panel-actions">
        {existing && <button type="button" className="ed-btn ed-btn--danger" onClick={remove}>Remove link</button>}
        <button type="button" className="ed-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="ed-btn ed-btn--primary" disabled={!url} onClick={save}>{existing ? 'Update link' : 'Add link'}</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Image panel: description + show-on + upload / Photos library / link       */
/* ------------------------------------------------------------------------ */

let libraryCache = null;

function ImagePanel({ replace, initial, uploading, fileInputRef, uploadFile, onChoose, onClose }) {
  const [alt, setAlt] = useState(initial.alt);
  const [show, setShow] = useState(initial.show);
  const [source, setSource] = useState(null); // 'library' | 'url'
  const [url, setUrl] = useState('');
  const [lib, setLib] = useState({ loading: false, error: null, items: libraryCache });
  const [q, setQ] = useState('');
  const altRef = useRef(null);
  useEffect(() => { altRef.current?.focus(); }, []);

  const altOk = !altMissing(alt);

  const loadLibrary = () => {
    setSource('library');
    if (libraryCache) return;
    setLib({ loading: true, error: null, items: null });
    productService.getExistingImages('products')
      .then((d) => {
        const items = [...new Set((d?.images || []).filter((p) => typeof p === 'string' && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(p)))];
        libraryCache = items;
        setLib({ loading: false, error: null, items });
      })
      .catch((e) => setLib({ loading: false, error: e?.message || 'Could not load photos', items: null }));
  };

  const pickFile = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.onPick = async (file) => {
      if (!file) return;
      const src = await uploadFile(file);
      if (src) onChoose(src, alt.trim(), show);
    };
    fileInputRef.current.click();
  };

  const shown = (lib.items || []).filter((p) => !q || p.toLowerCase().includes(q.toLowerCase())).slice(0, 48);

  return (
    <div className="ed-panel ed-panel--image" role="group" aria-label={replace ? 'Replace image' : 'Add image'} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="ed-panel-row">
        <label className="ed-field ed-field--grow">
          <span>Description (required)</span>
          <input ref={altRef} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Black ankle sock, side view" aria-required="true" />
        </label>
        <div className="ed-field">
          <span>Show on</span>
          <div className="ed-chips" role="group" aria-label="Show on">
            {[['both', 'Both'], ['desktop', 'Desktop only'], ['mobile', 'Phone only']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={show === id} className={`ed-chip${show === id ? ' is-on' : ''}`} onClick={() => setShow(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      {!altOk && <span className="ed-hint">Write a short description first — it helps Google and shoppers using screen readers.</span>}
      <div className="ed-panel-actions ed-panel-actions--start">
        <button type="button" className="ed-btn ed-btn--primary" disabled={!altOk || uploading} onClick={pickFile}>
          <Icon icon={Upload04Icon} size={15} /> {uploading ? 'Uploading…' : 'Upload from device'}
        </button>
        <button type="button" className={`ed-btn${source === 'library' ? ' is-on' : ''}`} disabled={!altOk} onClick={loadLibrary}>Photos library</button>
        <button type="button" className={`ed-btn${source === 'url' ? ' is-on' : ''}`} disabled={!altOk} onClick={() => setSource('url')}>Paste a link</button>
        <button type="button" className="ed-btn ed-btn--quiet" onClick={onClose}>Cancel</button>
      </div>

      {altOk && source === 'url' && (
        <div className="ed-panel-row">
          <label className="ed-field ed-field--grow">
            <span>Image link</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          </label>
          <button type="button" className="ed-btn ed-btn--primary ed-btn--end" disabled={!/^https?:\/\//i.test(url.trim())} onClick={() => onChoose(url.trim(), alt.trim(), show)}>
            {replace ? 'Use this image' : 'Insert'}
          </button>
        </div>
      )}

      {altOk && source === 'library' && (
        <div className="ed-lib">
          <input className="ed-lib-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name" aria-label="Search photos" />
          {lib.loading && <span className="ed-hint">Loading photos…</span>}
          {lib.error && <span className="ed-hint ed-hint--bad">{lib.error}. <button type="button" className="ed-linkbtn" onClick={() => { libraryCache = null; loadLibrary(); }}>Try again</button></span>}
          {lib.items && !shown.length && <span className="ed-hint">No photos found.</span>}
          {shown.length > 0 && (
            <div className="ed-lib-grid">
              {shown.map((p) => (
                <button key={p} type="button" className="ed-lib-item" title={p.split('/').pop()} onClick={() => onChoose(libraryUrl(p), alt.trim(), show)}>
                  <img src={libraryUrl(p)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Editor;
