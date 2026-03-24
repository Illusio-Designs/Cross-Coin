import { AccountSidebar } from '@/components/account/AccountSidebar'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        <AccountSidebar />
        <div>{children}</div>
      </div>
    </section>
  )
}
