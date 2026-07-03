'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'

/** /cart opens the bag drawer and returns home — no standalone cart page. */
export default function CartRedirectPage() {
  const router = useRouter()
  const { openDrawer } = useCart()

  useEffect(() => {
    openDrawer()
    router.replace('/')
  }, [openDrawer, router])

  return null
}
