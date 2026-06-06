import { apiClient } from '@/lib/api/client'

function parseSections(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function mapPost(p) {
  const sections = parseSections(p.sections)
  const firstContent = sections[0]?.content || ''
  const excerpt = firstContent.replace(/<[^>]+>/g, '').substring(0, 160).trim() + (firstContent.length > 160 ? '...' : '')
  const body = sections.map((s) => `${s.heading ? `<h2>${s.heading}</h2>` : ''}${s.content || ''}`).join('')
  const wordCount = sections.reduce((a, s) => a + (s.content?.replace(/<[^>]+>/g, '').split(/\s+/).length || 0), 0)

  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    excerpt: excerpt || p.title,
    body,
    category: p.BlogCategory?.name || p.category?.name || '',
    tags: (p.Tags || []).map((t) => t.name),
    coverImage: p.hero_image || '',
    author: { name: p.author_name || 'Velquira', avatar: '' },
    publishedAt: p.published_at || p.created_at || new Date().toISOString(),
    readTime: Math.max(1, Math.ceil(wordCount / 200)),
  }
}

export async function getPosts() {
  const data = await apiClient.get('/api/blogs/listing', { suppressErrorToast: true })
  const posts = data?.data || data?.posts || data || []
  return Array.isArray(posts) ? posts.map(mapPost) : []
}

export async function getPost(slug) {
  const data = await apiClient.get(`/api/blogs/by-slug/${slug}`, { suppressErrorToast: true })
  const post = data?.data || data
  return mapPost(post)
}
