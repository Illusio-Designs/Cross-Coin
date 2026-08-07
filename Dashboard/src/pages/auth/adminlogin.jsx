// The admin login now lives at /login. Keep this old path working by
// redirecting any existing links/bookmarks.
export async function getServerSideProps() {
  return { redirect: { destination: '/login', permanent: true } };
}
export default function AdminLoginRedirect() { return null; }
