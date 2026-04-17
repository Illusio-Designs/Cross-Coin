
import { getMe } from '@/lib/api/auth';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata = { title: 'Account Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getMe().catch(() => null);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-3xl font-normal text-brand-black">Settings</h1>
      <ProfileForm user={user} />
    </div>);

}