import { inr } from './data';

export default function BundleCards({ options, selected, onSelect, comparePrice, pairsPerPack }) {
  return (
    <section className="ccbundles" aria-label="Bundle and save">
      <h2 className="ccbundles__title">Bundle &amp; Save</h2>
      <div className="ccbundles__grid" style={{ '--bundle-columns': Math.min(options.length, 3) }}>
        {options.map((option, index) => {
          const mrp = comparePrice * option.pairs;
          const discount = mrp > option.total ? Math.round((1 - option.total / mrp) * 100) : 0;
          const badge = option.badge || (index === 1 ? 'Most popular' : index === 2 ? 'Best value' : '');
          return (
            <button type="button" key={option.pairs} className={`ccbundles__card${selected === option.pairs ? ' is-selected' : ''}`}
              aria-pressed={selected === option.pairs} onClick={() => onSelect(option.pairs)}>
              <span className={`ccbundles__badge${badge ? '' : ' is-empty'}`}>{badge || '\u00a0'}</span>
              <span className="ccbundles__content">
                <strong className="ccbundles__quantity">{option.pairs} Pack{option.pairs > 1 ? 's' : ''}</strong>
                <strong className="ccbundles__price">{inr(option.total / (option.pairs * (pairsPerPack || 1)))}</strong>
                <span className="ccbundles__unit">per {pairsPerPack ? 'pair' : 'pack'}</span>
                {pairsPerPack && <span className="ccbundles__contents">{option.pairs * pairsPerPack} pair{option.pairs * pairsPerPack > 1 ? 's' : ''} total</span>}
                <strong className="ccbundles__total">{inr(option.total)} total</strong>
                <span className="ccbundles__mrp">{discount > 0 ? <s>{inr(mrp)}</s> : '\u00a0'}</span>
                <span className={`ccbundles__discount${discount ? '' : ' is-empty'}`}>{discount ? `${discount}% OFF` : '\u00a0'}</span>
              </span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .ccbundles { width: 100%; min-width: 0; margin-top: 22px; }
        .ccbundles,.ccbundles * { box-sizing: border-box; }
        .ccbundles .ccbundles__title { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; color: var(--ink); font-family: inherit; font-size: 16px; font-weight: 800; text-transform: uppercase; line-height: 1.4; letter-spacing: .04em; }
        .ccbundles__title::before,.ccbundles__title::after { content: ''; height: 1px; background: color-mix(in srgb,var(--ink) 20%,transparent); flex: 1; }
        .ccbundles__grid { display: grid; grid-template-columns: repeat(var(--bundle-columns),minmax(0,1fr)); gap: 10px; }
        .ccbundles__card { display: flex; flex-direction: column; min-width: 0; padding: 0; overflow: hidden; border: 1px solid color-mix(in srgb,var(--ink) 22%,var(--surface)); border-radius: 10px; background: var(--surface); color: var(--ink); font: inherit; text-align: center; cursor: pointer; transition: background .15s,border-color .15s; }
        .ccbundles__card.is-selected { border-color: var(--crimson); background: color-mix(in srgb,var(--crimson) 3%,var(--surface)); box-shadow: inset 0 0 0 1px var(--crimson); }
        .ccbundles__card:focus-visible { outline: 3px solid var(--crimson); outline-offset: 4px; }
        .ccbundles__badge { display: grid; place-items: center; min-height: 28px; padding: 5px 4px; background: var(--ink); color: var(--surface); font-size: 10px; line-height: 1.2; font-weight: 800; text-transform: uppercase; }
        .ccbundles__badge.is-empty { background: transparent; }
        .ccbundles__content { display: flex; flex: 1; flex-direction: column; align-items: center; padding: 12px 7px 16px; }
        .ccbundles__quantity { font-size: 16px; line-height: 1.3; }
        .ccbundles__price { margin-top: 9px; color: var(--ink); font-size: 26px; line-height: 1.15; }
        .ccbundles__unit { margin-top: 2px; color: var(--ink-soft); font-size: 11px; }
        .ccbundles__contents { margin-top: 5px; color: var(--ink-soft); font-size: 11px; }
        .ccbundles__total { width: 100%; margin-top: 12px; padding-top: 10px; border-top: 1px solid color-mix(in srgb,var(--ink) 10%,transparent); font-size: 14px; line-height: 1.4; }
        .ccbundles__mrp { margin-top: 4px; color: var(--ink-faint); font-size: 11px; }
        .ccbundles__discount { margin-top: 8px; padding: 3px 8px; border-radius: 5px; color: var(--crimson); background: color-mix(in srgb,var(--crimson) 7%,var(--surface)); font-size: 10px; font-weight: 700; }
        .is-empty { visibility: hidden; }
        .ccbundles__caption { margin-top: 14px; font-size: 12px; line-height: 1.4; }
        @media(max-width:380px) { .ccbundles__grid { gap: 6px; } .ccbundles__quantity { font-size: 14px; } .ccbundles__contents { margin-top: 5px; color: var(--ink-soft); font-size: 11px; }
        .ccbundles__total { font-size: 12px; } .ccbundles__badge { font-size: 9px; } .ccbundles__price { font-size: 22px; } .ccbundles__caption { font-size: 11px; } }
      `}</style>
    </section>
  );
}
