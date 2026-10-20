'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AccountPageSkeleton } from '@/components/account/AccountSkeletons'

export default function SettingsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/account') }, [router])
  // Redirecting to /account — show that page's skeleton instead of a blank screen.
  return <AccountPageSkeleton />
}
