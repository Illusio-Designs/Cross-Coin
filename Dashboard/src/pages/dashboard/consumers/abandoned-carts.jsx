export function getServerSideProps() {
  return { redirect: { destination: '/dashboard/whatsapp#carts', permanent: false } };
}

export default function AbandonedCarts() {
  return null;
}
