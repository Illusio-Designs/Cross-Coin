import Link from 'next/link';
import { getBlogPage } from '@/lib/api/blog';

export const metadata = {
  title: 'Journal — Velmique Maison de Parfum',
  description: 'Notes from the VELMIQUE maison — the craft, the ingredients and the art of wearing fragrance.',
};

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };

export default async function MaisonJournal() {
  let posts = [];
  try { posts = (await getBlogPage({ page: 1, limit: 12 })).posts || []; } catch { posts = []; }

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">The journal</span>
        <h1>Notes from the Maison.</h1>
        <p>On craft, ingredients and the art of wearing fragrance.</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {posts.length ? (
          <div className="m-jgrid">
            {posts.map((p) => (
              <Link className="m-jcard" href={`/test/journal/${p.slug}`} key={p.id}>
                {p.thumbImage ? <img className="m-jcard__img" src={p.thumbImage} alt={p.title} loading="lazy" /> : <span className="m-jcard__img" />}
                <div className="m-jcard__b">
                  {p.category ? <span className="m-jcard__cat">{p.category}</span> : null}
                  <span className="m-jcard__t">{p.title}</span>
                  <span className="m-jcard__x">{p.excerpt}</span>
                  <span className="m-jcard__meta">{fmtDate(p.publishedAt)} · {p.readTime} min read</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="m-empty"><h3>Stories are on their way</h3><p>Our journal is being written. Please check back soon.</p></div>
        )}
      </div>
    </>
  );
}
