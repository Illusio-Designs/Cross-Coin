import { PageHeadSkeleton, ProseSkeleton } from '../_components/Skeleton';

/* Policy page while its dashboard-authored text streams in. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="Legal" title={<>Terms of Use</>} lede="The terms that govern your use of the Velmique website and services." />
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <ProseSkeleton className="m-prose m-policy" />
      </div>
    </>
  );
}
