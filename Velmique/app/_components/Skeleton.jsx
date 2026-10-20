/* Velmique "Mint" skeleton kit.

   Loading placeholders drawn in the exact place and shape the real content
   takes, using the Mint classes themselves (.m-card, .m-ordcard, .m-jcard …)
   so radii, paddings and grid columns always match the live page. The
   shimmer is the `.sk` class in app/mint.css.

   Plain markup (no hooks), so it works in server components, route
   `loading.jsx` files and client components alike. Every region is wrapped
   in <SkRegion> (role="status" + a visually-hidden label); the shapes inside
   are aria-hidden. */

const px = (v) => (typeof v === 'number' ? `${v}px` : v);

/* One shimmer bar / box. `w` / `h` / `r` accept numbers (px) or CSS strings. */
export function Sk({ w, h = 12, r, inline = false, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`sk${inline ? ' sk--in' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: px(w), height: px(h), borderRadius: px(r), ...style }}
    />
  );
}

/* Announces the loading region once to assistive tech. */
export function SkRegion({ label = 'Loading…', as: Tag = 'div', className, style, children }) {
  return (
    <Tag role="status" aria-busy="true" className={className} style={style}>
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  );
}

/* ── Page header (.m-ph): real copy where it is known, bars where it isn't ── */
export function PageHeadSkeleton({ eyebrow, title, lede, children }) {
  return (
    <section className="m-wrap m-ph">
      {eyebrow ? <span className="m-eyebrow">{eyebrow}</span> : <Sk w={120} h={11} style={{ marginBlock: 3 }} />}
      {title ? <h1>{title}</h1> : <Sk w="min(440px,72%)" h="clamp(34px,6vw,64px)" r={8} style={{ marginTop: 14 }} />}
      {lede ? <p>{lede}</p> : lede === false ? null : <Sk w="min(420px,82%)" h={14} style={{ marginTop: 18 }} />}
      {children}
    </section>
  );
}

/* ── Product card (.m-card): 1/1.15 tile, name + price row, notes, reviews ──
   `lines="name"` for cards that only show name + price (wishlist);
   `button` for cards that always carry a full-width button (wishlist, pack).
   On touch screens the live card shows its in-body "Add to bag" button, so
   the skeleton reserves it there too. */
export function ProductCardSkeleton({ lines = 'full', button = false }) {
  return (
    <div className="m-card m-card--sk" aria-hidden="true">
      <div className="m-card__fig"><span className="m-card__tile sk sk--flat" /></div>
      <div className="m-card__body">
        <div className="m-card__top" style={{ alignItems: 'center' }}>
          <Sk w="56%" h={18} />
          <Sk w={58} h={15} />
        </div>
        {lines === 'full' ? (
          <>
            <Sk w="72%" h={10} style={{ marginTop: 9 }} />
            <Sk w="34%" h={11} style={{ marginTop: 13 }} />
          </>
        ) : null}
        <Sk h={40} r={8} className={`m-card__skbtn${button ? ' m-card__skbtn--on' : ''}`} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, label = 'Loading fragrances…', className = 'm-pgrid', lines, button }) {
  return (
    <SkRegion label={label} className={className}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} lines={lines} button={button} />)}
    </SkRegion>
  );
}

/* ── Collection chips (.m-filterbar) ── */
const CHIP_W = [44, 104, 86, 120, 78, 96];
export function ChipsSkeleton({ count = 5, style }) {
  return (
    <div className="m-filterbar" aria-hidden="true" style={style}>
      {CHIP_W.slice(0, count).map((w, i) => <Sk key={i} w={w} h={39} r={8} />)}
    </div>
  );
}

/* ── Shop / collection body: chips, toolbar, grid (route loading only) ── */
export function ShopGridSkeleton() {
  return (
    <SkRegion label="Loading fragrances…" className="m-wrap m-section" style={{ paddingTop: 0 }}>
      <ChipsSkeleton />
      <div className="m-toolbar" aria-hidden="true">
        <Sk w={104} h={12} />
        <div className="m-toolbar__r"><Sk w={86} h={39} r={8} /><Sk w={168} h={41} r={8} /></div>
      </div>
      <div className="m-pgrid">
        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </SkRegion>
  );
}

/* ── Fragrance note orbs (.m-pnotegrid) ── */
export function NoteOrbsSkeleton({ count = 6 }) {
  return (
    <div className="m-pnotegrid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="m-pn" key={i}>
          <span className="sk sk--r" style={{ aspectRatio: '1', marginBottom: 13 }} />
          <Sk w="60%" h={18} style={{ marginInline: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

/* ── Review cards (.m-revs > .m-rev) ── */
export function ReviewCardsSkeleton({ count = 3 }) {
  return (
    <div className="m-revs" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="m-rev" key={i}>
          <Sk w={86} h={14} />
          <div style={{ margin: '16px 0 20px', display: 'grid', gap: 9 }}>
            <Sk w="96%" h={18} /><Sk w="88%" h={18} /><Sk w="54%" h={18} />
          </div>
          <div className="m-rev__by">
            <Sk w={40} h={40} r={8} />
            <span style={{ display: 'grid', gap: 7, flex: 1 }}><Sk w="44%" h={12} /><Sk w="32%" h={10} /></span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Product page: crumb, stacked gallery (4/4.8 shots), buy column ── */
export function PdpSkeleton() {
  return (
    <>
      <SkRegion label="Loading fragrance…" className="m-pdpwrap">
        <div className="m-wrap" aria-hidden="true">
          <Sk w={230} h={13} style={{ marginBottom: 25 }} />
          <div className="m-pdp">
            <div className="m-gstack">
              <span className="m-gshot sk" />
              <span className="m-gshot sk" />
            </div>
            <div>
              <Sk w="68%" h="clamp(32px,4.4vw,48px)" r={8} style={{ marginTop: 12 }} />
              <Sk w={150} h={11} style={{ marginTop: 14 }} />
              <Sk w={210} h={14} style={{ marginTop: 20 }} />
              <Sk w={190} h={34} r={8} style={{ marginTop: 26 }} />
              <Sk w={130} h={11} style={{ marginTop: 14 }} />
              <div className="m-ship"><Sk w={96} h={30} r={8} /><Sk w={200} h={16} /></div>
              <div className="m-opt">
                <Sk w={90} h={12} style={{ marginBottom: 15 }} />
                <div className="m-sizes"><Sk w={92} h={77} r={8} /><Sk w={92} h={77} r={8} /><Sk w={92} h={77} r={8} /></div>
              </div>
              <div className="m-buybar"><Sk w={118} h={52} r={8} /><Sk h={52} r={8} style={{ flex: 1 }} /></div>
              <Sk h={59} r={8} style={{ marginTop: 12 }} />
              <Sk h={92} r={8} style={{ marginTop: 22 }} />
              <div className="m-rsec">
                <Sk w={70} h={11} />
                <Sk w="52%" h={26} r={6} style={{ marginTop: 12 }} />
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <Sk w="100%" h={13} /><Sk w="96%" h={13} /><Sk w="90%" h={13} /><Sk w="62%" h={13} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkRegion>
      <SkRegion label="Loading reviews…" as="section" className="m-section">
        <div className="m-wrap" aria-hidden="true">
          <div className="m-revhead">
            <div><Sk w={130} h={11} /><Sk w={260} h="clamp(28px,4vw,42px)" r={8} style={{ marginTop: 12 }} /></div>
            <Sk w={170} h={46} r={8} />
          </div>
          <ReviewCardsSkeleton />
        </div>
      </SkRegion>
    </>
  );
}

/* ── Order card (.m-ordcard.m-ocard) — account orders ── */
export function OrderCardSkeleton() {
  return (
    <li className="m-ordcard m-ocard" aria-hidden="true">
      <div className="m-ordhead">
        <div style={{ display: 'grid', gap: 10 }}><Sk w={150} h={21} /><Sk w={210} h={11} /></div>
        <Sk w={92} h={26} r={8} />
      </div>
      <div className="m-othumbs">
        <Sk w={56} h={64} r={8} /><Sk w={56} h={64} r={8} />
      </div>
      <Sk w={180} h={12} style={{ marginTop: 14 }} />
      <div className="m-oactions"><Sk w={110} h={14} /><Sk w={64} h={41} r={8} style={{ marginLeft: 'auto' }} /></div>
    </li>
  );
}

export function OrderListSkeleton({ count = 3, label = 'Loading your orders…' }) {
  return (
    <SkRegion label={label}>
      <ul className="m-olist">
        {Array.from({ length: count }).map((_, i) => <OrderCardSkeleton key={i} />)}
      </ul>
    </SkRegion>
  );
}

/* ── Simple order row (.m-ordcard.m-ordhead) — returns list ── */
export function OrderRowsSkeleton({ count = 3, label = 'Loading…' }) {
  return (
    <SkRegion label={label}>
      <ul className="m-olist">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i} className="m-ordcard m-ordhead" aria-hidden="true">
            <div style={{ display: 'grid', gap: 10 }}><Sk w={140} h={20} /><Sk w={170} h={11} /></div>
            <Sk w={132} h={41} r={8} />
          </li>
        ))}
      </ul>
    </SkRegion>
  );
}

/* ── Saved addresses (.m-addcard + .m-addrgrid) ── */
export function AddressListSkeleton({ count = 2 }) {
  return (
    <SkRegion label="Loading addresses…">
      <Sk h={58} r={8} style={{ marginBottom: 16 }} />
      <ul className="m-addrgrid" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i} className="m-ordcard m-addr">
            <div className="m-ordhead"><Sk w="46%" h={20} /></div>
            <div style={{ display: 'grid', gap: 9, marginTop: 14 }}><Sk w="88%" h={13} /><Sk w="64%" h={13} /><Sk w="52%" h={13} /></div>
            <div className="m-oactions"><Sk w={96} h={14} /><Sk w={36} h={14} /><Sk w={48} h={14} /></div>
          </li>
        ))}
      </ul>
    </SkRegion>
  );
}

/* ── Whole account page: header, side card with stats, tabs, orders ── */
export function AccountSkeleton() {
  return (
    <>
      <section className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>My Maison.</h1></section>
      <SkRegion label="Loading your account…" className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-acct" aria-hidden="true">
          <aside className="m-acctside">
            <Sk w="62%" h={24} style={{ marginBlock: 7 }} />
            <Sk w="78%" h={12} style={{ marginTop: 10 }} />
            <div className="m-stats">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}><Sk w="50%" h={9} style={{ marginTop: 3 }} /><Sk w={30} h={24} style={{ marginBlock: '9px 6px' }} /></div>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              {[0, 1, 2, 3].map((i) => <Sk key={i} h={52} r={8} />)}
            </div>
          </aside>
          <div>
            <div className="m-tabs"><Sk w={100} h={43} r={8} /><Sk w={128} h={43} r={8} /><Sk w={176} h={43} r={8} /></div>
            <ul className="m-olist">
              {[0, 1, 2].map((i) => <OrderCardSkeleton key={i} />)}
            </ul>
          </div>
        </div>
      </SkRegion>
    </>
  );
}

/* ── Track-order result: status card + steps, timeline/payment, items ── */
export function TrackResultSkeleton() {
  return (
    <SkRegion label="Finding your order…">
      <div aria-hidden="true">
        <div className="m-ordcard">
          <div className="m-ordhead">
            <div style={{ display: 'grid', gap: 9 }}><Sk w={50} h={11} /><Sk w={190} h={22} /><Sk w={220} h={11} /></div>
            <Sk w={96} h={26} r={8} />
          </div>
          <div className="m-steps" style={{ marginBottom: 0 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 10 }}><Sk w={32} h={32} r={8} /><Sk w="70%" h={10} /></div>
            ))}
          </div>
        </div>
        <div className="m-trackgrid">
          <div className="m-ordcard">
            <Sk w={110} h={22} style={{ marginBottom: 18 }} />
            <div style={{ display: 'grid', gap: 16 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ display: 'grid', gap: 7 }}><Sk w="46%" h={13} /><Sk w="70%" h={11} /></div>)}
            </div>
          </div>
          <div className="m-ordcard">
            <Sk w={100} h={22} style={{ marginBottom: 18 }} />
            <div style={{ display: 'grid', gap: 18 }}><Sk h={13} /><Sk h={13} /><Sk h={18} /></div>
          </div>
        </div>
        <div className="m-ordcard">
          <Sk w={80} h={22} style={{ marginBottom: 16 }} />
          {[0, 1].map((i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0' }}>
              <Sk w={52} h={60} r={8} />
              <div style={{ display: 'grid', gap: 7 }}><Sk w="54%" h={14} /><Sk w="30%" h={11} /></div>
              <Sk w={64} h={14} />
            </div>
          ))}
        </div>
      </div>
    </SkRegion>
  );
}

/* ── Bag page lines (.m-crow) + summary (.m-summary) ── */
export function BagSkeleton({ lines = 2 }) {
  return (
    <SkRegion label="Loading your bag…" className="m-cartgrid">
      <ul className="m-crows" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <li className="m-crow" key={i}>
            <div style={{ gridArea: 'img' }}><span className="m-crow__img sk" style={{ display: 'block' }} /></div>
            <div style={{ gridArea: 'body', display: 'grid', gap: 9 }}>
              <Sk w="60%" h={21} /><Sk w="30%" h={11} /><Sk w={86} h={30} r={8} style={{ marginTop: 6 }} />
            </div>
            <Sk w={70} h={21} style={{ gridArea: 'price', justifySelf: 'end' }} />
          </li>
        ))}
      </ul>
      <aside className="m-summary" aria-hidden="true">
        <Sk w="64%" h={24} style={{ marginBottom: 22 }} />
        <div style={{ display: 'grid', gap: 20 }}><Sk h={14} /><Sk h={14} /><Sk h={20} /></div>
        <Sk h={52} r={8} style={{ marginTop: 26 }} />
        <Sk h={52} r={8} style={{ marginTop: 10 }} />
      </aside>
    </SkRegion>
  );
}

/* ── Journal cards (.m-jgrid > .m-jcard, 3/2 image) ── */
export function JournalGridSkeleton({ count = 6 }) {
  return (
    <SkRegion label="Loading stories…" className="m-jgrid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="m-jcard" key={i} aria-hidden="true">
          <span className="m-jcard__img sk sk--flat" />
          <div className="m-jcard__b">
            <Sk w={80} h={10} />
            <Sk w="88%" h={22} /><Sk w="60%" h={22} />
            <div style={{ display: 'grid', gap: 8, flex: 1 }}><Sk w="100%" h={12} /><Sk w="80%" h={12} /></div>
            <Sk w="52%" h={10} />
          </div>
        </div>
      ))}
    </SkRegion>
  );
}

/* ── Collection tiles (.m-colgrid > .m-colcard, first one wide) ── */
export function CollectionsGridSkeleton({ count = 3 }) {
  return (
    <SkRegion label="Loading collections…" className="m-colgrid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`m-colcard sk ${i === 0 ? 'wide' : ''}`} aria-hidden="true">
          <span className="m-colcard__b">
            <Sk w="38%" h="clamp(24px,3vw,36px)" r={6} />
            <Sk w="58%" h={13} />
            <Sk w={130} h={10} style={{ marginTop: 4 }} />
          </span>
        </div>
      ))}
    </SkRegion>
  );
}

/* ── Auth card (.m-authcard.m-formcard): fields + submit ── */
export function AuthCardSkeleton({ fields = 1, check = false }) {
  return (
    <SkRegion label="Loading…" className="m-wrap m-section" style={{ paddingTop: 0 }}>
      <div className="m-authcard m-formcard" aria-hidden="true">
        {Array.from({ length: fields }).map((_, i) => (
          <div className="m-field" key={i}><Sk w={110} h={10} style={{ marginBottom: 10 }} /><Sk h={51} r={8} /></div>
        ))}
        {check ? <Sk w="86%" h={14} style={{ margin: '4px 0 18px' }} /> : null}
        <Sk h={52} r={8} />
        <Sk w="62%" h={13} style={{ margin: '22px auto 0' }} />
      </div>
    </SkRegion>
  );
}

/* ── Policy / long-form prose (.m-prose) ── */
export function ProseSkeleton({ paragraphs = 4, className = 'm-prose' }) {
  return (
    <SkRegion label="Loading…" className={className}>
      <div aria-hidden="true">
        {Array.from({ length: paragraphs }).map((_, p) => (
          <div key={p} style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
            {p % 2 === 0 ? <Sk w="42%" h={26} r={6} style={{ marginBottom: 6 }} /> : null}
            <Sk w="100%" h={14} /><Sk w="97%" h={14} /><Sk w="92%" h={14} /><Sk w="68%" h={14} />
          </div>
        ))}
      </div>
    </SkRegion>
  );
}

/* ── Returns & refunds: request list body, and the whole page ── */
export function ReturnsBodySkeleton() {
  return (
    <>
      <h2 className="m-card-h" style={{ margin: '26px 0 14px' }}>Request a return</h2>
      <OrderRowsSkeleton count={2} label="Loading your returns…" />
    </>
  );
}

export function ReturnsSkeleton() {
  return (
    <>
      <PageHeadSkeleton eyebrow="Account · Returns" title={<>Returns &amp; Refunds.</>} lede="Request a return within 7 days of delivery and follow your refund here." />
      <div className="m-wrap m-section m-narrow" style={{ paddingTop: 0 }}>
        <ReturnsBodySkeleton />
      </div>
    </>
  );
}

/* ── Search box (.m-searchform) for the search page shell ── */
export function SearchFormSkeleton() {
  return (
    <SkRegion label="Loading search…" className="m-searchform">
      <Sk h={51} r={8} style={{ flex: 1, minWidth: 0 }} />
      <Sk w={120} h={52} r={8} />
    </SkRegion>
  );
}

/* ── Track form card (.m-trackform) for the track page shell ── */
export function TrackFormSkeleton() {
  return (
    <SkRegion label="Loading order tracking…" className="m-trackform">
      <Sk h={51} r={8} style={{ flex: 1, minWidth: 200 }} />
      <Sk w={104} h={52} r={8} />
    </SkRegion>
  );
}
