import { useState } from 'react';
import DOMPurify from 'dompurify';

/**
 * Renders product + global FAQs as an accordion.
 * - Product FAQs come first, then global. Empty arrays render nothing.
 * - Answers are HTML (rich text editor output from admin) → sanitised by DOMPurify
 *   before being rendered, even though the source is trusted (defence in
 *   depth in case a compromised admin account injects script tags).
 * - DOMPurify only works in the browser; during SSR we render the plain
 *   stripped text so the initial HTML is still searchable.
 */
export default function ProductFaqSection({ productFaqs = [], globalFaqs = [] }) {
  const items = [...(productFaqs || []), ...(globalFaqs || [])];
  const [openIdx, setOpenIdx] = useState(0);

  if (items.length === 0) return null;

  const renderAnswer = (html) => {
    if (typeof window === 'undefined') {
      // SSR: strip tags so we don't ship raw markup before hydration.
      const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return <p style={{ margin: 0 }}>{text}</p>;
    }
    const clean = DOMPurify.sanitize(html || '', {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'span', 'h3', 'h4', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
  };

  return (
    <section className="pdt-faqs" aria-label="Frequently asked questions" style={{ margin: '32px 0' }}>
      <h2 className="pdt-section-title" style={{ marginBottom: 16 }}>Frequently Asked Questions</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {items.map((f, i) => {
          const open = openIdx === i;
          return (
            <div
              key={f.id || i}
              style={{
                borderTop: i === 0 ? 'none' : '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? -1 : i)}
                aria-expanded={open}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  background: open ? '#f9fafb' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#180D3E',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ flex: 1 }}>{f.question}</span>
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, color: '#6b7280' }}>
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && (
                <div style={{ padding: '0 16px 16px', color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
                  {renderAnswer(f.answer)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
