// Live login route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestLogin from './test/login';

export default function TestLoginLive() {
  return <TestLogin />;
}
TestLoginLive.mintChrome = true;
