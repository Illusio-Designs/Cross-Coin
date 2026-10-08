import Icon from '@/components/Icon';
import { textBlocks } from '@/lib/text';
import ProductDetailBlocks from '@/components/product/ProductDetailBlocks';

// Full-width sections under the buy panel: the complete description, the
// Ideal for / care / manufacturing blocks and FAQs. Everything comes from the product record / FAQ API — a section with
// no data is simply not rendered. Admin rich text is shown as plain text.
export default function ProductStory({ product, faqs = [] }) {
  const blocks = textBlocks(product.description);
  const items = faqs.slice(0, 6);

  return (
    <div className="pdx-story">
      {blocks.length > 0 && (
        <section className="pdx-story-sec" aria-labelledby="pdx-desc-h">
          <span className="eyebrow">About this product</span>
          <h2 id="pdx-desc-h">Product description</h2>
          <div className="pdx-desc">
            {blocks.map((b, i) => b.type === 'ul'
              ? <ul key={i}>{b.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
              : <p key={i}>{b.lines[0]}</p>)}
          </div>
        </section>
      )}

      <section className="pdx-story-sec" aria-label="Details">
        <ProductDetailBlocks product={product} />
      </section>

      {items.length > 0 && (
        <section className="pdx-story-sec" aria-labelledby="pdx-faq-h">
          <span className="eyebrow">Good to know</span>
          <h2 id="pdx-faq-h">Questions</h2>
          <div className="pdx-faq">
            {items.map((f, i) => (
              <details key={f.id ?? i} open={i === 0}>
                <summary>{f.question}<Icon name="ChevronDown" size={18} /></summary>
                <div className="pdx-faq-a">
                  {textBlocks(f.answer).map((b, k) => b.type === 'ul'
                    ? <ul key={k}>{b.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
                    : <p key={k}>{b.lines[0]}</p>)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
