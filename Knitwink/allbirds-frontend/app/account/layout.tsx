import { AccountSidebar } from '@/components/account/AccountSidebar'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-site px-6 py-12 md:px-10 lg:px-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        <AccountSidebar />
        <div>{children}</div>
      </div>
    </div>
  )
}
