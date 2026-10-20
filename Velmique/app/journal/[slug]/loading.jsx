import { ProseSkeleton, Sk, SkRegion } from '../../_components/Skeleton';

/* A story while it streams in: crumb, title, byline, the 16/8 cover and the
   first paragraphs — the same column as the live article. */
export default function Loading() {
  return (
    <div className="m-section"><div className="m-wrap">
      <SkRegion label="Loading story…" className="m-hero--article">
        <div aria-hidden="true">
          <Sk w={140} h={13} style={{ margin: '0 auto 25px' }} />
          <Sk w="min(640px,88%)" h="clamp(32px,5vw,58px)" r={8} style={{ marginInline: 'auto' }} />
          <Sk w="min(420px,60%)" h="clamp(32px,5vw,58px)" r={8} style={{ margin: '10px auto 0' }} />
          <Sk w={260} h={12} style={{ margin: '20px auto 0' }} />
          <span className="sk m-hero__cover" />
        </div>
      </SkRegion>
      <div style={{ marginTop: 40 }}><ProseSkeleton paragraphs={3} /></div>
    </div></div>
  );
}
