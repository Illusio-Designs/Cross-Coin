import AnnouncementBar from './AnnouncementBar';
import Navbar from './Navbar';

/* Announcement bar sits at the very top (scrolls away), with the sticky cream
   navbar below it on every route. */
export default function HeaderShell() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
    </>
  );
}
