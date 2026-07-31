import Link from 'next/link';

/* BlogCard — editorial gallery. Used by the journal list and the home
   BlogStrip. A clean cover image on white with a tiny caption below:
   category label, title, and a quiet author/date byline. */

export default function BlogCard({ post }) {
  return (
    <Link href={`/journal/${post.slug}`} className="group flex flex-col">
      {/* Cover — clean, sharp */}
      <div className="media-zoom relative aspect-[4/3] overflow-hidden bg-paper-warm">
        <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Body */}
      <div className="pt-4 flex flex-col flex-1">
        <span className="eyebrow text-ink-muted mb-2">{post.category}</span>
        <h3 className="text-[15px] leading-snug text-ink transition-opacity group-hover:opacity-60 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-[13px] text-ink-soft leading-relaxed mt-2 line-clamp-2 flex-1">{post.excerpt}</p>

        {/* Byline */}
        <div className="flex items-center gap-2.5 mt-4">
          <span className="text-[13px] text-ink truncate">{post.author}</span>
          <span className="eyebrow text-ink-muted">{post.date} · {post.readTime}</span>
        </div>
      </div>
    </Link>
  );
}
