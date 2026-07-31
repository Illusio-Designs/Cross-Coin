import Link from 'next/link';

/* BlogCard — techwear datasheet card. Used by the journal list and the home
   BlogStrip. Shows cover, mono category tag, Space Grotesk title, excerpt and
   an author/date byline on a hairline. */

export default function BlogCard({ post }) {
  const initials = (post.author || 'G')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link href={`/journal/${post.slug}`} className="group flex flex-col">
      {/* Cover */}
      <div className="media-zoom relative aspect-[4/3] overflow-hidden rounded-[16px] bg-paper-warm border border-line shadow-soft transition-colors group-hover:border-accent">
        <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
        <span className="spec absolute top-3.5 left-3.5 bg-paper/95 backdrop-blur-sm text-ink border border-line px-2.5 py-1 rounded shadow-soft">
          {post.category}
        </span>
      </div>

      {/* Body */}
      <div className="pt-5 flex flex-col flex-1">
        <h3 className="h-display text-xl md:text-[1.4rem] leading-snug text-ink transition-colors group-hover:text-accent-deep line-clamp-2">
          {post.title}
        </h3>
        <p className="prose-body text-sm mt-2 line-clamp-2 flex-1 text-justify">{post.excerpt}</p>

        {/* Byline */}
        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-line">
          <span className="w-8 h-8 rounded-lg bg-ink text-paper text-[11px] font-mono font-medium flex items-center justify-center shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-ink leading-tight truncate">{post.author}</p>
            <p className="spec text-ink-muted leading-tight">{post.date} · {post.readTime}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
