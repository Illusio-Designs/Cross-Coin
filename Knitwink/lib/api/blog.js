

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function serverFetch(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export const getPosts = () => serverFetch('/blog/posts')
export const getPost = (slug) => serverFetch(`/blog/posts/${slug}`)