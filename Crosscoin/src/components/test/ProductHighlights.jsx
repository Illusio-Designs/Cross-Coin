import { I } from './ui';

function FeatureIcon({ type }) {
  const paths = {
    calendar: <><rect x="4" y="5" width="24" height="24" rx="4" /><path d="M10 2v6m12-6v6M4 12h24" /><text x="16" y="25" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" fontWeight="700">7</text></>,
    mesh: <><path d="M6 22V8m10 14V8m10 14V8M3 12l3-4 3 4m4 0 3-4 3 4m4 0 3-4 3 4M3 26c4-4 6 4 10 0s6 4 10 0 5 0 6 0" /></>,
    arch: <path d="M20 3v11c0 3 4 4 6 6 3 3 0 6-4 6H6c-4 0-4-4-1-5l9-4c3-2 2-8 2-14m-8 20c4-5 7 1 12 0" />,
    layers: <><path d="m16 3 13 7-13 7L3 10 16 3Zm-13 14 13 7 13-7M3 24l13 7 13-7" /></>,
    socks: <><path d="M13 4h8v12l-9 12c-3 4-10 0-7-4l8-10V4Zm8 0h7v12l-9 12" /></>,
  };
  return <svg width="30" height="30" viewBox="0 0 32 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function ProductHighlights({ pairsPerPack }) {
  const features = [['mesh', <>Breathable<br />Mesh</>], ['arch', <>Arch<br />Support</>], ['layers', <>Everyday<br />Wear</>], ['socks', pairsPerPack ? `Pack of ${pairsPerPack}` : 'Comfort Fit']];
  return (
    <div className="cc-highlights">
      <div className="cc-highlights__banner">
        <span className="cc-highlights__calendar"><FeatureIcon type={pairsPerPack === 7 ? 'calendar' : 'socks'} /></span>
        <div><strong>{pairsPerPack === 7 ? '7 Pairs. 7 Days. One Perfect Pack.' : pairsPerPack ? `${pairsPerPack} Pairs. Everyday Comfort.` : 'Made for Everyday Comfort.'}</strong><p>Built for work, travel, casual wear &amp; everyday comfort.</p></div>
      </div>
      <div className="cc-highlights__features">
        {features.map(([icon, label]) => <div className="cc-highlights__feature" key={icon}><FeatureIcon type={icon} /><span>{label}</span></div>)}
      </div>
      <div className="cc-highlights__services">
        <span>{I.truck(17)} Free Shipping</span><span>{I.card(17)} COD Available</span><span>{I.ret(17)} Easy Returns</span>
      </div>
      <style jsx>{`
        .cc-highlights { margin-top: 18px; color: var(--ink); font-family: Inter, sans-serif; }
        .cc-highlights__banner { display: flex; align-items: center; gap: 13px; padding: 15px; border-radius: 10px; background: #edf7ef; }
        .cc-highlights__calendar { flex: 0 0 46px; display: grid; place-items: center; padding-right: 12px; border-right: 1px solid #a5c6aa; }
        .cc-highlights__banner strong { font-size: 16px; line-height: 1.4; }
        .cc-highlights__banner p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--ink-soft); }
        .cc-highlights__features { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-top: 12px; padding: 13px 0; background: var(--surface); border: 1px solid #e4e5e7; border-radius: 10px; }
        .cc-highlights__feature { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 6px; padding: 0 5px; text-align: center; font-size: 12px; font-weight: 600; line-height: 1.35; }
        .cc-highlights__feature + .cc-highlights__feature { border-left: 1px solid #e4e5e7; }
        .cc-highlights__services { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 10px; }
        .cc-highlights__services span { display: flex; justify-content: center; align-items: center; gap: 6px; min-width: 0; padding: 9px 3px; border: 1px solid #e4e5e7; border-radius: 18px; background: var(--surface); font-size: 11px; font-weight: 600; line-height: 1.3; }
        @media(max-width:380px) { .cc-highlights__banner { padding: 12px; gap: 10px; } .cc-highlights__banner strong { font-size: 14px; } .cc-highlights__services { gap: 5px; } .cc-highlights__services span { font-size: 10px; gap: 4px; } }
      `}</style>
    </div>
  );
}
