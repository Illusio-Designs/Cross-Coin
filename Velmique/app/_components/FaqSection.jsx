import DescriptionHtml from '@/components/product/DescriptionHtml';
import { sanitizeRich } from '@/lib/sanitizeHtml';

export default function FaqSection({ faqs, className = '' }) {
  if (!faqs.length) return null;

  return (
    <section className={`m-section m-faq-section ${className}`}>
      <div className="m-wrap">
        <div className="m-shead">
          <span className="m-eyebrow">Good to know</span>
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="m-faq">
          {faqs.map((faq) => (
            <details key={faq.id}>
              <summary>{faq.question}</summary>
              <DescriptionHtml className="m-faq__a" html={sanitizeRich(faq.answer)} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
