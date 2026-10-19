import { redirect } from 'next/navigation';

// This route used to render a FAKE checkout that collected card number / expiry
// / CVV into plain inputs and "placed" the order by just clearing the cart and
// showing a bogus confirmation — no backend, no payment, no order created. The
// real purchase flow lives in the cart drawer (COD + Razorpay, via the backend
// API), so send anyone who reaches /checkout to the cart where that opens.
export default function CheckoutPage() {
  redirect('/cart');
}
