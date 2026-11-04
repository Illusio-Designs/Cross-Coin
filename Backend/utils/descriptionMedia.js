// Only repair local upload image URLs. CDN paths must stay byte-for-byte intact.
function normalizeDescriptionMedia(html, apiBase) {
  if (typeof html !== 'string') return html;
  let base;
  try { base = new URL(apiBase); } catch { return html; }
  if (!['http:', 'https:'].includes(base.protocol)) return html;
  const origin = base.origin;
  return html.replace(/(<img\b[^>]*?\s+src\s*=\s*)(["'])([^"']*)\2/gi, (match, prefix, quote, source) => {
    let url;
    const src = source.trim();
    if (/^\/?(?:api\/)?uploads\//i.test(src)) {
      url = new URL(`/${src.replace(/^\//, '')}`, origin);
    } else {
      try { url = new URL(src); } catch { return match; }
      if (url.origin !== origin && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return match;
    }
    if (!/^\/(?:api\/)?uploads\//i.test(url.pathname)) return match;
    url.pathname = url.pathname.replace(/^\/(?:api\/)?uploads\//i, '/api/uploads/');
    const repaired = `${origin}${url.pathname}${url.search}${url.hash}`;
    return `${prefix}${quote}${repaired}${quote}`;
  });
}
module.exports = { normalizeDescriptionMedia };
