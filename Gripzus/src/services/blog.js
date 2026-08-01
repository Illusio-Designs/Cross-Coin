/* Blog / Journal — brand-filtered, same endpoints as Knitwink:
   GET /api/blogs/listing      → all published posts
   GET /api/blogs/by-slug/:slug → a single post

   Maps every backend post to the shape the Gripzus journal pages and
   BlogCard expect (author string, formatted date, "N min read", and a
   body as an array of clean plain-text paragraphs). */

import { ikFull } from '../utils/imagekit';

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

async function brandFetch(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Brand-Name': BRAND_NAME },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

/* Backend stores a post body as JSON "sections" — [{ heading, content }]. */
function parseSections(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

/* Strip all tags + common entities from an HTML fragment → clean text. */
function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* HTML section content → typed blocks. Headings (<h1>–<h6>) keep their
   own block so the detail page can render them bold / highlighted;
   everything else becomes a paragraph block. */
function htmlToBlocks(html) {
  if (!html) return [];
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  let matched = false;
  while ((m = re.exec(html)) !== null) {
    matched = true;
    const text = stripTags(m[2]);
    if (!text) continue;
    blocks.push({
      type: /^h[1-6]$/i.test(m[1]) ? 'heading' : 'paragraph',
      text,
    });
  }
  if (!matched) {
    // No block tags — split plain text on line breaks.
    String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map((s) => stripTags(s))
      .filter(Boolean)
      .forEach((text) => blocks.push({ type: 'paragraph', text }));
  }
  return blocks;
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Backend post → Gripzus journal post shape. */
function mapPost(p) {
  if (!p) return null;
  const sections = parseSections(p.sections);

  // Body: typed blocks — the section heading, then its content blocks,
  // flattened across every section.
  const body = sections.flatMap((s) => [
    ...(s.heading ? [{ type: 'heading', text: String(s.heading).trim() }] : []),
    ...htmlToBlocks(s.content),
  ]);

  const plain = body.map((b) => b.text).join(' ');
  const excerpt =
    p.excerpt ||
    (plain.length > 160 ? `${plain.slice(0, 160).trim()}…` : plain) ||
    p.title ||
    '';

  const wordCount = plain ? plain.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    id:       String(p.id ?? p.slug ?? ''),
    slug:     p.slug,
    title:    p.title || 'Untitled',
    excerpt,
    body:     body.length ? body : [{ type: 'paragraph', text: p.title || '' }],
    category: p.BlogCategory?.name || p.category?.name || p.category || 'Journal',
    image:    ikFull(p.hero_image || p.coverImage || p.image || '', 1400),
    author:   p.author_name || p.author || 'Gripzus',
    date:     formatDate(p.published_at || p.created_at),
    readTime: `${minutes} min read`,
  };
}

/* All published posts — GET /api/blogs/listing */
export async function getPosts() {
  try {
    const data = await brandFetch('/api/blogs/listing');
    const posts = data?.data || data?.posts || data || [];
    return (Array.isArray(posts) ? posts : []).map(mapPost).filter(Boolean);
  } catch {
    return [];
  }
}

/* Paginated listing — GET /api/blogs/listing?page=&limit=
   Returns mapped posts plus pagination metadata for the journal list page.
   getPosts() (home BlogStrip) still returns a plain array. */
export async function getPostsPage({ page = 1, limit = 12 } = {}) {
  try {
    const data = await brandFetch(`/api/blogs/listing?page=${page}&limit=${limit}`);
    const posts = data?.data || data?.posts || data || [];
    return {
      posts: (Array.isArray(posts) ? posts : []).map(mapPost).filter(Boolean),
      totalPages: data?.pagination?.totalPages || 1,
      page: data?.pagination?.page || page,
    };
  } catch {
    return { posts: [], totalPages: 1, page };
  }
}

/* Single post by slug — GET /api/blogs/by-slug/:slug */
export async function getPostBySlug(slug) {
  if (!slug) return null;
  try {
    const data = await brandFetch(`/api/blogs/by-slug/${encodeURIComponent(slug)}`);
    return mapPost(data?.data || data);
  } catch {
    return null;
  }
}
