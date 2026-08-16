import Link from 'next/link';
import Icon from '@/components/Icon';

// Right-size ImageKit covers to an exact 16:9 (800x450) server-side — matches
// the CrossCoin blog card so every card image is pre-cropped, sharp and light.
function ik(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io')) {
    return `${src.split('?')[0]}?tr=w-800,h-450,q-70,f-auto`;
  }
  return src;
}

// One blog card used by BOTH the home Journal section and the /journal listing
// so they look identical: lookbook overlay — meta, title and "read" laid over
// the cover image.
export default function BlogCard({ post }) {
  const p = post || {};
  return (
    <Link href={`/journal/${p.slug}`} className="blog-card">
      <div className="blog-media">
        {p.image
          ? <img src={ik(p.image)} alt={p.title} loading="lazy" />
          : <span aria-hidden><Icon name="Sparkles" size={40} /></span>}
        <div className="blog-cap">
          <div className="blog-meta">
            {p.category && <span className="blog-cat">{p.category}</span>}
            {p.date && <><span>·</span><span>{p.date}</span></>}
          </div>
          <h3>{p.title}</h3>
          <span className="blog-read">Read article <Icon name="ArrowRight" size={13} /></span>
        </div>
      </div>
    </Link>
  );
}
