import { ProductGridSkeleton, Sk, SkRegion } from '../_components/Skeleton';

/* Build-a-pack while it streams in: the real intro and steps, the tier cards
   and savings track as bars, then the pack cards (with their add button). */
export default function Loading() {
  return (
    <section className="m-section" style={{ paddingBottom: 'clamp(20px,3vw,34px)' }}>
      <div className="m-wrap">
        <div className="m-packhero">
          <span className="m-eyebrow">Build Your Pack</span>
          <h1>Create Your <em>Fragrance Set</em></h1>
          <p>Mix any scents you love into one pack — watch the stepper unlock bigger savings as you add.</p>
          <div className="m-packsteps">
            <div className="m-pstep now"><i>1</i> Pick your scents</div>
            <span className="m-plink" />
            <div className="m-pstep"><i>2</i> Unlock savings</div>
            <span className="m-plink" />
            <div className="m-pstep"><i>3</i> Add to bag</div>
          </div>
          <SkRegion label="Loading pack savings…">
            <div className="m-packtiers" aria-hidden="true">
              {[0, 1, 2].map((i) => <Sk key={i} h={132} r={8} />)}
            </div>
            <div className="m-ttrack" aria-hidden="true"><Sk h={4} style={{ position: 'absolute', top: 15, left: '16%', right: '16%', width: 'auto' }} /></div>
          </SkRegion>
        </div>
        <div className="m-packshead">Choose your fragrances</div>
        <ProductGridSkeleton className="m-packgrid" button label="Loading fragrances…" />
      </div>
    </section>
  );
}
