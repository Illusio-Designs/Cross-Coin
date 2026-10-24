import './product-details.css';

const ADDRESS = 'Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat (India)';
const MFG_TITLE = 'Manufacturing details';

function Icon() {
  return (
    <span className="pdd-ic" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </span>
  );
}

export default function ProductDetailBlocks({ product }) {
  const origin = String((product && product.origin) || '').trim() || 'India';
  const badge = (
    <span className="pdd-origin">
      {/india/i.test(origin) && <span className="pdd-flag" aria-hidden="true" />}
      {origin}
    </span>
  );

  return (
    <section className="pdd pdd-mb" aria-label="Product details">
      <div className="pdd-blk">
        <h3 className="pdd-h">{MFG_TITLE}</h3>
        <div className="pdd-mfg">
          <div className="pdd-left">
            <span className="pdd-pin"><Icon /></span>
            <p className="pdd-addr">{ADDRESS}</p>
          </div>
          {badge}
        </div>
      </div>
    </section>
  );
}
