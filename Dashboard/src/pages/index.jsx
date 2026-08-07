// Standalone dashboard app — the root just sends you into the dashboard, which
// handles auth (shows the admin login when signed out).
export async function getServerSideProps() {
  return { redirect: { destination: '/dashboard', permanent: false } };
}
export default function Index() { return null; }
