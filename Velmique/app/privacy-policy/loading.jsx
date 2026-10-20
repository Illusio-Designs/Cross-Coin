import { PageHeadSkeleton, ProseSkeleton } from '../_components/Skeleton';

/* Policy page while its dashboard-authored text streams in. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="Legal" title={<>Privacy Policy</>} lede="How we collect, use and protect your personal information when you shop with Velmique." />
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <ProseSkeleton className="m-prose m-policy" />
      </div>
    </>
  );
}
