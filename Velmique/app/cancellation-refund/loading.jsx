import { PageHeadSkeleton, ProseSkeleton } from '../_components/Skeleton';

/* Policy page while its dashboard-authored text streams in. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="Customer care" title={<>Cancellation &amp; Refund</>} lede="How to cancel an order and how refunds are processed back to your UPI, card or bank." />
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <ProseSkeleton className="m-prose m-policy" />
      </div>
    </>
  );
}
