import { PdpSkeleton } from '../../_components/Skeleton';

/* Shown while a product page streams in on navigation: crumb, the stacked
   gallery at its real 4/4.8 shot ratio, the buy column and the reviews. */
export default function Loading() {
  return <PdpSkeleton />;
}
