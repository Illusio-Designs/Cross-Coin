import { JournalGridSkeleton, PageHeadSkeleton } from '../_components/Skeleton';

/* Journal list while it streams in: the real title, then 3-up story cards. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="The journal" title="Notes from the Maison." lede="On craft, ingredients and the art of wearing fragrance." />
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <JournalGridSkeleton />
      </div>
    </>
  );
}
