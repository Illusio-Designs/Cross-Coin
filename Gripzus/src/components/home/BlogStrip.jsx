import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JOURNAL_POSTS } from '../../data/journal';
import { getPosts } from '../../services/blog';
import BlogCard from '../common/BlogCard';

/* Journal teaser strip — latest three posts.
   Pulls from the blog API on mount; falls back to the local seed data
   (also used when posts are passed in explicitly by a parent). */

export default function BlogStrip({ posts: postsProp }) {
  const [posts, setPosts] = useState(postsProp || JOURNAL_POSTS);

  useEffect(() => {
    if (postsProp) return; // parent supplied posts — don't override
    let active = true;
    getPosts()
      .then((data) => {
        if (active && data && data.length) setPosts(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [postsProp]);

  const list = posts.slice(0, 3);

  return (
    <section className="section-y bg-paper-warm border-y border-line">
      <div className="wrap">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow mb-3">From The Thread</p>
            <h2 className="h-display text-3xl md:text-5xl">Notes from <span className="h-italic">the atelier.</span></h2>
          </div>
          <Link href="/journal" className="hidden sm:inline-flex btn-outline">All stories</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
          {list.map((p) => <BlogCard key={p.slug} post={p} />)}
        </div>

        <div className="mt-9 sm:hidden">
          <Link href="/journal" className="btn-outline w-full">All stories</Link>
        </div>
      </div>
    </section>
  );
}
