import LoginClient from './LoginClient';
import Msg91Loader from '@/components/Msg91Loader';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  // The shopper is about to request an OTP: load the MSG91 widget now
  // (elsewhere it loads after the page has finished loading).
  return (
    <>
      <Msg91Loader eager />
      <LoginClient />
    </>
  );
}
