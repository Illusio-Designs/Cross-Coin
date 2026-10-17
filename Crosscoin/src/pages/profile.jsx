// Live profile route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestAccount from './test/account';

export default function TestAccountLive() {
  return <TestAccount />;
}
TestAccountLive.mintChrome = true;
