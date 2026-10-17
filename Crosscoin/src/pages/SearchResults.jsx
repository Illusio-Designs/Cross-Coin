// Live SearchResults route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestSearch from './test/search';

export default function TestSearchLive() {
  return <TestSearch />;
}
TestSearchLive.mintChrome = true;
