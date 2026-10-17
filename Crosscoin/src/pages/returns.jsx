// Live returns route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestReturns from './test/returns';

export default function TestReturnsLive() {
  return <TestReturns />;
}
TestReturnsLive.mintChrome = true;
