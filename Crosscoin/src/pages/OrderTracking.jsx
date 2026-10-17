// Live OrderTracking route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestTrack from './test/track';

export default function TestTrackLive() {
  return <TestTrack />;
}
TestTrackLive.mintChrome = true;
