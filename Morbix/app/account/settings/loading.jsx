import Link from 'next/link';
import { FormSkeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <b>Settings</b>
      </nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>Settings</h1></div>
      <div className="settings-single">
        <FormSkeleton fields={3} label="Loading your profile…" />
      </div>
    </div>
  );
}
