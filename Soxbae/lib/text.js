/* Turn admin rich-text (HTML) into safe plain text blocks. The storefront has
   no HTML sanitizer, so product descriptions, care notes and FAQ answers are
   rendered as text only: tags are dropped, line breaks and list items are kept. */

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };

export function htmlToText(html) {
  if (html == null) return '';
  return String(html)
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|blockquote)\s*>/gi, '\n\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] || m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Plain-text blocks: [{ type: 'p' | 'ul', lines: string[] }]. */
export function textBlocks(html) {
  const text = htmlToText(html);
  if (!text) return [];
  return text.split(/\n{2,}/).flatMap((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    const out = [];
    let para = [];
    let list = [];
    const flushPara = () => { if (para.length) { out.push({ type: 'p', lines: [para.join(' ')] }); para = []; } };
    const flushList = () => { if (list.length) { out.push({ type: 'ul', lines: list }); list = []; } };
    lines.forEach((l) => {
      if (l.startsWith('• ')) { flushPara(); list.push(l.slice(2).trim()); }
      else { flushList(); para.push(l); }
    });
    flushPara(); flushList();
    return out;
  });
}

/** First sentence(s) of a description, capped, for the short intro in the buy panel. */
export function leadFrom(html, max = 150) {
  const flat = htmlToText(html).replace(/\s*\n+\s*/g, ' ').replace(/• /g, '').trim();
  if (!flat) return '';
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > 60) return cut.slice(0, stop + 1);
  const sp = cut.lastIndexOf(' ');
  return `${cut.slice(0, sp > 60 ? sp : max).trim()}…`;
}

/** Split a care note ("Gentle wash, do not bleach. Dry in shade") into short steps. */
export function careSteps(html) {
  return htmlToText(html)
    .split(/[\n.;•]+|,\s+(?=[A-Za-z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 8);
}
