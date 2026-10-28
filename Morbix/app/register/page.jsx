import RegisterClient from './RegisterClient';
import Msg91Loader from '@/components/Msg91Loader';
import '@/app/styles/account.css';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  // The shopper is about to request an OTP: load the MSG91 widget now
  // (elsewhere it loads after the page has finished loading).
  return (
    <>
      <Msg91Loader eager />
      <RegisterClient />
    </>
  );
}
