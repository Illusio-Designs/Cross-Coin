import Link from 'next/link';

/* BlogCard — used by the journal list and the home BlogStrip.
   Shows cover, category, title, excerpt and an author/date byline. */

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
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
        <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute top-3 left-3 bg-paper/95 backdrop-blur-sm text-ink text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-sm">
          {post.category}
        </span>
      </div>

      {/* Body */}
      <div className="pt-4 flex flex-col flex-1">
        <h3 className="h-display text-xl md:text-[1.4rem] leading-snug text-ink group-hover:underline underline-offset-4 line-clamp-2">
          {post.title}
        </h3>
        <p className="prose-body text-sm mt-2 line-clamp-2 flex-1 text-justify">{post.excerpt}</p>

        {/* Byline */}
        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-line">
          <span className="w-8 h-8 rounded-full bg-ink text-paper text-[11px] font-medium flex items-center justify-center shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-ink leading-tight truncate">{post.author}</p>
            <p className="text-[11px] text-ink-muted leading-tight">{post.date} · {post.readTime}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
