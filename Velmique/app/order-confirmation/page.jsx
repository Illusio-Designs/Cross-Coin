import { redirect } from 'next/navigation';

// This route used to fabricate a random order number (#VLQ-#####) and a fake
// "Thank you" page, with no real order behind it. Real orders confirm in the
// cart drawer and land on /track-order?order=<number>. There's no order context
// on a direct hit here, so send the visitor to their account (order history).
export default function OrderConfirmation() {
  redirect('/account');
}
