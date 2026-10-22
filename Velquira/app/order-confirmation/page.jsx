import OrderConfirmationClient from './OrderConfirmationClient';

// The thank-you page after every order:
//   our own checkout      → ?order=<order number>
//   Shiprocket Checkout   → ?oid=<Shiprocket order>&ost=<status>
export const metadata = { title: 'Thank you', robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const order = String(sp.order || '').slice(0, 64);
  const id = String(sp.id || '').replace(/\D/g, '').slice(0, 12);
  const oid = String(sp.oid || '').slice(0, 64);
  const ost = String(sp.ost || '').toUpperCase().slice(0, 32);
  return <OrderConfirmationClient key={order || oid} order={order} id={id} oid={oid} ost={ost} />;
}
