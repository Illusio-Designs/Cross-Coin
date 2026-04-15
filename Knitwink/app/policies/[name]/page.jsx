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
      <section className="relative overflow-hidden bg-brand-black px-6 py-20 text-center md:px-10 md:py-28">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">Legal</p>
          <h1 className="mt-3 text-3xl font-bold text-white lg:text-4xl">
            {loading ? 'Loading…' : policy?.title || formatTitle(name)}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
            Please read this policy carefully before using our services.
          </p>
        </div>
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
