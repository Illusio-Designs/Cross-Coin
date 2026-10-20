import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPosts } from '../../services/blog';
import BlogCard from '../common/BlogCard';
import { BlogCardSkeletons } from '../common/Skeleton';

/* Journal teaser strip — latest three posts, from the blog API.
   Renders nothing until real posts are available — no seed/dummy data. */

export default function BlogStrip({ posts: postsProp }) {
  const [posts, setPosts] = useState(postsProp || []);
  // Client fallback fetch in flight (server sent no posts) → hold the strip.
  const [pending, setPending] = useState(!postsProp);

  useEffect(() => {
    if (postsProp) return; // parent supplied posts — don't override
    let active = true;
    getPosts()
      .then((data) => {
        if (active && data && data.length) setPosts(data);
      })
      .catch(() => {})
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [postsProp]);

  const list = posts.slice(0, 3);
  if (!list.length && !pending) return null;

  return (
    <section className="section-y bg-paper-warm border-y border-line">
      <div className="wrap">
        <div className="flex flex-col items-start gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="eyebrow mb-3">From The Thread</p>
            <h2 className="h-display text-2xl sm:text-3xl md:text-5xl">Notes from <span className="h-italic">the atelier.</span></h2>
          </div>
          <Link href="/journal" className="btn-outline shrink-0">All stories</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7" {...(!list.length ? { role: 'status', 'aria-busy': true, 'aria-label': 'Loading stories…' } : {})}>
          {list.length
            ? list.map((p) => <BlogCard key={p.slug} post={p} />)
            : <BlogCardSkeletons n={3} />}
        </div>
      </div>
    </section>
  );
}
