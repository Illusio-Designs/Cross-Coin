'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPolicyByName } from '@/lib/api/policies'

function formatTitle(name) {
  return (name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function PolicyPage() {
  const { name } = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!name) return
    setLoading(true)
    getPolicyByName(name)
      .then(data => setPolicy(data))
      .catch(() => setError('Failed to load policy'))
      .finally(() => setLoading(false))
  }, [name])

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-black px-6 py-14 text-center md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">
          {loading ? 'Loading…' : policy?.title || formatTitle(name)}
        </h1>
        <p className="mt-3 text-sm text-white/50">Please read this policy carefully before using our services.</p>
      </section>

      {/* Content */}
      <section className="bg-white px-6 py-10 md:px-10 md:py-14 lg:px-16">
        <div className="w-full">
          {loading && (
            <div className="flex flex-col gap-4 py-10">
              {[90, 70, 95, 60, 80, 50, 85].map((w, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-gray-100" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {error && <p className="py-20 text-center text-sm text-red-500">{error}</p>}

          {!loading && !error && !policy && (
            <p className="py-20 text-center text-sm text-gray-400">Policy not found.</p>
          )}

          {policy?.content && (
            <div
              className="policy-content"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />
          )}
        </div>
      </section>
    </>
  )
}
