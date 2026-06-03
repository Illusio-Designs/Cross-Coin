'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const NAV = [
{ label: 'Overview', href: ROUTES.account },
{ label: 'Orders', href: ROUTES.orders },
{ label: 'Settings', href: ROUTES.settings }];


export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav className="flex flex-col gap-1" aria-label="Account navigation">
      {NAV.map((item) =>
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'rounded-lg px-4 py-2.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
          pathname === item.href ?
          'bg-gray-100 font-medium text-brand-black' :
          'text-gray-600 hover:text-brand-black'
        )}>
        
          {item.label}
        </Link>
      )}
      <button
        onClick={logout}
        className="mt-4 rounded-lg px-4 py-2.5 text-left text-sm text-gray-600 transition-colors duration-150 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
        
        Sign Out
      </button>
    </nav>);

}