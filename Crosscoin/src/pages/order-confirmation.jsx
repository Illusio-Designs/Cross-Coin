// Thank-you route after every order — our own checkout (?order=<order number>)
// and Shiprocket Checkout's return (?oid=&ost=). Same Mint page as /thank-you
// (noindex via its own Head), which fires the Purchase once per order.
import TestThankYou from './test/thank-you';

export default function OrderConfirmation() {
  return <TestThankYou />;
}
OrderConfirmation.mintChrome = true;
