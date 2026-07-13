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
    <nav className="flex flex-col border-t border-line" aria-label="Account navigation">
      {NAV.map((item) =>
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'border-b border-line border-l-2 py-4 pl-4 text-[10px] font-semibold uppercase tracking-[0.24em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
          pathname === item.href ?
          'border-l-gold text-ink' :
          'border-l-transparent text-text-muted hover:text-ink'
        )}>

          {item.label}
        </Link>
      )}
      <button
        onClick={logout}
        className="mt-8 w-fit border-b border-line pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted transition-colors duration-300 hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">

        Sign Out
      </button>
    </nav>);

}
