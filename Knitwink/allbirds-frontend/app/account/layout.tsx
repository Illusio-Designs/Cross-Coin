import { AccountSidebar } from '@/components/account/AccountSidebar'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-site px-5 py-12 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        <AccountSidebar />
        <div>{children}</div>
      </div>
    </div>
  )
}
