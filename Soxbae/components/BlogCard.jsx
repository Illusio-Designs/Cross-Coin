import Link from 'next/link';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';


// Shared Soxbae journal card — a 16:9 image (cropped to the box by CSS) with a category tag tucked over it, a date, serif title
// and a read link. Used on the home journal strip and the full Journal page.
export default function BlogCard({ post }) {
  if (!post) return null;
  return (
    <Link href={`/journal/${post.slug}`} className="sx-jr-card">
      <div className="sx-jr-media">
        {(post.thumb || post.image)
          ? <ShimmerImg src={post.thumb || post.image} alt={post.title} width={800} widths={[400, 800]} sizes="(max-width: 560px) 100vw, (max-width: 860px) 50vw, 400px"
              fallback={<span aria-hidden><Icon name="Sparkles" size={30} /></span>} />
          : <span aria-hidden><Icon name="Sparkles" size={30} /></span>}
        {post.category && <span className="sx-jr-tag">{post.category}</span>}
      </div>
      <div className="sx-jr-body">
        {post.date && <span className="sx-jr-date">{post.date}</span>}
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
        <span className="sx-jr-more">Read article <Icon name="ArrowRight" size={14} /></span>
      </div>
    </Link>
  );
}
