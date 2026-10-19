import Link from 'next/link';
import { getBlogPage } from '@/lib/api/blog';
import { seoMeta } from '@/lib/site';
import { ik } from '@/lib/imagekit';
import Pager from '../_components/Pager';

export const revalidate = 600;
const PER_PAGE = 12;

export async function generateMetadata({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  return seoMeta('blog', {
    title: page > 1 ? `Journal — page ${page} — Velmique` : 'Journal — Velmique Maison de Parfum',
    description: 'Notes from the VELMIQUE maison — the craft, the ingredients and the art of wearing fragrance.',
    path: page > 1 ? `/journal?page=${page}` : '/journal',
  });
}

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };

export default async function MaisonJournal({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  let data = { posts: [], totalPages: 1 };
  let failed = false;
  try { data = await getBlogPage({ page, limit: PER_PAGE }); } catch { failed = true; }
  const { posts, totalPages } = data;

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">The journal</span>
        <h1>Notes from the Maison.</h1>
        <p>On craft, ingredients and the art of wearing fragrance.</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {posts.length ? (
          <>
            <div className="m-jgrid">
              {posts.map((p) => (
                <Link className="m-jcard" href={`/journal/${p.slug}`} key={p.id}>
                  {p.thumbImage ? <img className="m-jcard__img" src={ik(p.thumbImage, 700)} alt="" loading="lazy" /> : <span className="m-jcard__img" />}
                  <div className="m-jcard__b">
                    {p.category ? <span className="m-jcard__cat">{p.category}</span> : null}
                    <h2 className="m-jcard__t">{p.title}</h2>
                    <span className="m-jcard__x">{p.excerpt}</span>
                    <span className="m-jcard__meta">{fmtDate(p.publishedAt)} · {p.readTime} min read</span>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 ? <Pager page={Math.min(page, totalPages)} pages={totalPages} hrefFor={(n) => (n > 1 ? `/journal?page=${n}` : '/journal')} /> : null}
          </>
        ) : (
          <div className="m-empty">
            <h3>{failed ? 'The journal is resting' : 'Stories are on their way'}</h3>
            <p style={{ marginBottom: 20 }}>{failed ? 'We couldn’t load the journal just now. Please try again shortly.' : 'Our journal is being written. Please check back soon.'}</p>
            {page > 1 ? <Link className="m-btn m-btn--ghost" href="/journal">Back to the latest stories</Link> : null}
          </div>
        )}
      </div>
    </>
  );
}
