import Link from 'next/link';
import Icon from '@/components/Icon';

// Pre-crop blog card images to 16:9 (800x450) via ImageKit — sharp, light and
// uniform, same as the CrossCoin journal cards. Non-ImageKit URLs pass through.
function blogImg(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('ik.imagekit.io')) {
    return `${url.split('?')[0]}?tr=w-800,h-450,q-70,f-auto`;
  }
  return url;
}

export default function BlogSection({ posts = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Journal</span>
          <h2 style={{ marginTop: 8 }}>Stories &amp; guides</h2>
        </div>
        <Link href="/journal" className="link-more">All articles <Icon name="ArrowRight" size={14} /></Link>
      </div>

      <div className="blog-grid">
        {posts.map((p) => (
          <Link href={`/journal/${p.slug}`} className="blog-card" key={p.slug}>
            <div className="blog-media">
              {p.image
                ? <img src={blogImg(p.image)} alt={p.title} loading="lazy" />
                : <span aria-hidden><Icon name="Sparkles" size={40} /></span>}
            </div>
            <div className="blog-body">
              <div className="blog-meta"><span className="blog-cat">{p.category}</span><span>·</span><span>{p.date}</span></div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="blog-read">Read article <Icon name="ArrowRight" size={13} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
