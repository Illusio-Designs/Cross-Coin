import OrderConfirmationClient from './OrderConfirmationClient';

// The thank-you page after every order:
//   our own checkout      → ?order=<order number>&id=<order id>
//   Shiprocket Checkout   → ?oid=<Shiprocket order>&ost=<status>
export const metadata = { title: 'Thank you', robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const order = String(sp.order || '').slice(0, 64);
  const oid = String(sp.oid || '').slice(0, 64);
  const ost = String(sp.ost || '').toUpperCase().slice(0, 32);
  return <OrderConfirmationClient key={order || oid} order={order} oid={oid} ost={ost} />;
}
