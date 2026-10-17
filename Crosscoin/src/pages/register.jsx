// Live register route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestRegister from './test/register';

export default function TestRegisterLive() {
  return <TestRegister />;
}
TestRegisterLive.mintChrome = true;
