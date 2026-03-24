import type { BlogPost } from '@/types'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

async function serverFetch<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
  if (!res.ok) throw new Error(`Failed to fetch ${path}`)
  return res.json()
}

export const getPosts = () => serverFetch<BlogPost[]>('/blog/posts', 300)

export const getPost = (slug: string) => serverFetch<BlogPost>(`/blog/posts/${slug}`, 300)
