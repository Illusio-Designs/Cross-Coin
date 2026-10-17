// Live thank-you route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestThankYou from './test/thank-you';

export default function TestThankYouLive() {
  return <TestThankYou />;
}
TestThankYouLive.mintChrome = true;
