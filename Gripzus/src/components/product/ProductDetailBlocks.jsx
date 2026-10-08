
/* Ideal for, care and manufacturing blocks under the product. Care steps come from the
   product's own care note when it has one, otherwise the store default below. Admin rich
   text is flattened to plain text, so nothing here renders HTML. */

const ADDRESS = 'Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat (India)';
const ADDRESS_SHORT = 'Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat';
const IDEAL_TITLE = 'Ideal for';
const CARE_TITLE = 'Care instructions';
const MFG_TITLE = 'Manufacturing details';
const IDEAL = [['run', 'Yoga'], ['user', 'Pilates'], ['star', 'Home workouts']];
const DEFAULT_CARE = [['wash', 'Gentle wash\n40°C'], ['nobleach', 'Do not\nbleach'], ['nowring', 'Do not\nwring'], ['flatdry', 'Flat dry in\nshade'], ['noiron', 'Do not\niron'], ['nodry', 'Do not dry\nclean']];

const PATHS = {
  wash: '<path d="M4 8h16l-1.5 9a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 8z"/><path d="M6 8c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0"/>',
  nobleach: '<path d="M12 4 21 19H3L12 4z"/><path d="M8.5 11.5l7 5M15.5 11.5l-7 5"/>',
  nowring: '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M5 5l14 14M19 5L5 19"/>',
  flatdry: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M3 12h18"/>',
  noiron: '<path d="M3 17h15c2 0 3-1.5 3-3.5 0-1.5-1-2.5-2.5-2.5H12L8 7H3v10z"/><path d="M6 6l14 14M20 6 6 20"/>',
  coolIron: '<path d="M3 17h15c2 0 3-1.5 3-3.5 0-1.5-1-2.5-2.5-2.5H12L8 7H3v10z"/><circle cx="9" cy="13" r="1"/>',
  nodry: '<circle cx="12" cy="12" r="8.5"/><path d="M8 8l8 8M16 8l-8 8"/>',
  notumble: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M5 5l14 14"/>',
  keepdry: '<path d="M12 3.5s6 6.2 6 10.3a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5z"/><path d="M4 4l16 16"/>',
  perfume: '<path d="M9 4h6v3H9zM8 7h8v3H8z"/><path d="M6 10h12v10H6z"/><path d="M3 5l16 16"/>',
  pouch: '<path d="M6 8c0-2 1.5-3.5 3-3.5h6c1.5 0 3 1.5 3 3.5l1 11H5L6 8z"/><path d="M8 8.5c2 1.3 6 1.3 8 0"/>',
  cloth: '<path d="M5 6c3-2 5 2 8 0s4-2 6 0v10c-2-2-3-2-6 0s-5-2-8 0V6z"/><path d="M12 9l.8 1.7L14.5 11l-1.7.8L12 13.5l-.8-1.7L9.5 11l1.7-.3L12 9z"/>',
  bath: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM7 12V7a2 2 0 0 1 4 0"/><path d="M6 20l-1 1.5M18 20l1 1.5"/>',
  heat: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.7-2.4 1.5-3.4C10.5 6.5 11.5 5.5 12 3z"/><path d="M12 20v1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  cool: '<path d="M12 3v18M5 7l14 10M19 7 5 17"/>',
  spray: '<path d="M10 4h4v3h-4zM9 7h6v13H9z"/><path d="M5 10h2M4 13h3M5 16h2"/>',
  cap: '<rect x="8" y="3" width="8" height="5" rx="1"/><path d="M7 8h10v12H7z"/><path d="M10 12h4"/>',
  noshake: '<path d="M7 7l10 10M17 7 7 17"/><path d="M4 12l2-2M20 12l-2 2"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  box: '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/>',
  gift: '<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M12 9v11M3 13h18M12 9c-3 0-5-1-5-3s3-2.5 5 3c2-5.5 5-5 5-3s-2 3-5 3"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  run: '<circle cx="14" cy="5" r="2"/><path d="M6 21l4-6-2-3 4-3 2 3h4M10 15l4 1 1 5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

const ICON_RULES = [[/dry.?clean/i, 'nodry'], [/bleach/i, 'nobleach'], [/wring/i, 'nowring'], [/tumble/i, 'notumble'], [/iron/i, 'IRON'], [/flat|shade|air|line|dry/i, 'flatdry'], [/wash|machine|cold|gentle|cycle|hand/i, 'wash']];

function Icon({ name }) {
  return (
    <span className="pdd-ic" aria-hidden="true">
      <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: PATHS[name] || PATHS.check }} />
    </span>
  );
}

function plain(html) {
  return String(html == null ? '' : html)
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

function iconFor(step) {
  for (const [re, icon] of ICON_RULES) {
    if (re.test(step)) {
      if (icon === 'IRON') return /\b(do not|don't|dont|no|never)\b/i.test(step) ? 'noiron' : 'coolIron';
      return icon;
    }
  }
  return 'check';
}

function stepsFor(care) {
  const own = plain(care)
    .split(/[\n.;•]+|,\s+(?=[A-Za-z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 8)
    .map((s) => [iconFor(s), s]);
  return own.length ? own : DEFAULT_CARE;
}

export default function ProductDetailBlocks({ product }) {
  const steps = stepsFor(product && product.care);
  const origin = String((product && product.origin) || '').trim() || 'India';
  const badge = (
    <span className="pdd-origin">
      {/india/i.test(origin) && <span className="pdd-flag" aria-hidden="true" />}
      {origin}
    </span>
  );

  return (
    <section className="pdd pdd-gz" aria-label="Product details">
      <div className="pdd-blk">
        <span className="pdd-eyebrow">{IDEAL_TITLE}</span>
        <div className="pdd-chips">
          {IDEAL.map(([icon, label]) => (
            <span className="pdd-chip" key={label}><Icon name={icon} />{label}</span>
          ))}
        </div>
      </div>
      <div className="pdd-blk">
        <h3 className="pdd-h">{CARE_TITLE}</h3>
        <div className="pdd-care">
          {steps.map(([icon, label]) => (
            <div key={label}>
              <Icon name={icon} />
              <span className="pdd-lab">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pdd-blk">
        <h3 className="pdd-h">{MFG_TITLE}</h3>
        <table className="pdd-table">
          <tbody>
            <tr><th scope="row">Manufacturer</th><td>Obzus India Private Limited</td></tr>
            <tr><th scope="row">Address</th><td>{ADDRESS_SHORT}</td></tr>
            <tr><th scope="row">Origin</th><td>{badge}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
