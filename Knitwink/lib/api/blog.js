

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function serverFetch(path, revalidate = 300) {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export const getPosts = () => serverFetch('/blog/posts', 300);

export const getPost = (slug) => serverFetch(`/blog/posts/${slug}`, 300);