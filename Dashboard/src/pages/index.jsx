// Standalone dashboard app — the root just sends you into the dashboard, which
// handles auth (shows the admin login when signed out). The public Obzus
// company site is a separate app (see the /Obzus folder).
export async function getServerSideProps() {
  return { redirect: { destination: '/dashboard', permanent: false } };
}
export default function Index() { return null; }
