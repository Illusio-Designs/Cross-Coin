export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  category: string
  coverImage: string
  author: {
    name: string
    avatar: string
  }
  publishedAt: string
  readTime: number
}
