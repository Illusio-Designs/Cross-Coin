import Link from 'next/link';
import Icon from '@/components/Icon';

// Right-size ImageKit card images to an exact 16:9 (800x450), sharp and light
// (same approach as the CrossCoin blog gallery). Non-ImageKit URLs pass through.
function ikBlog(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io')) {
    return `${src.split('?')[0]}?tr=w-800,h-450,q-70,f-auto`;
  }
  return src;
}

// Shared Soxbae journal card — a 16:9 image (pre-cropped server-side, filling
// the card uniformly) with a category tag tucked over it, a date, serif title
// and a read link. Used on the home journal strip and the full Journal page.
export default function BlogCard({ post }) {
  if (!post) return null;
  return (
    <Link href={`/journal/${post.slug}`} className="sx-jr-card">
      <div className="sx-jr-media">
        {post.image
          ? <img src={ikBlog(post.image)} alt={post.title} loading="lazy" />
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
