import Link from 'next/link';
import { getPolicyByName } from '@/lib/api/policies';
import { richHtml } from '@/lib/sanitizeHtml';

/* A legal / policy page: content is authored in the dashboard (Policies) and
   rendered on the server — sanitised — so it is in the HTML for crawlers. */
export default async function PolicyPage({ name, eyebrow = 'Legal', fallbackTitle, intro }) {
  const policy = await getPolicyByName(name).catch(() => null);
  const html = policy?.content || policy?.body || '';
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">{eyebrow}</span>
        <h1>{policy?.title || fallbackTitle}</h1>
        {intro ? <p>{intro}</p> : null}
      </section>
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {html ? (
          <article className="m-prose m-policy" {...richHtml(html)} />
        ) : (
          <div className="m-empty">
            <h3>This policy is being prepared</h3>
            <p style={{ marginBottom: 20 }}>Please check back shortly, or ask us anything in the meantime.</p>
            <Link className="m-btn m-btn--fill" href="/contact">Contact us</Link>
          </div>
        )}
      </div>
    </>
  );
}
