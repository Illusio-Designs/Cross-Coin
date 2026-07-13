'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getPolicyByName } from '@/lib/api/policies'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'
import { richHtml } from '@/lib/sanitizeHtml'

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

  const title = loading ? formatTitle(name) : (policy?.title || formatTitle(name))

  return (
    <SeoWrapper pageName={name || 'policy'}>
      <main className="bg-ivory">
        {/* Editorial page header */}
        <section className="vq-container pt-24 pb-10 text-center md:pt-32 md:pb-14">
          <Reveal>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              Policies
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-normal leading-[1.08] text-brand-black md:text-5xl">
              {title}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mx-auto mt-6 h-px w-12 bg-gold/60" />
          </Reveal>
        </section>

        {/* Article body */}
        <section>
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            {loading && (
              <div className="flex flex-col gap-4 py-6">
                {[92, 78, 96, 64, 84, 70, 88, 58].map((w, i) => (
                  <div
                    key={i}
                    className="h-3.5 animate-pulse rounded bg-brand-black/10"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="py-16 text-center">
                <p className="font-display italic text-[18px] text-brand-black/70">
                  This policy is being prepared. Please check back soon.
                </p>
                <Link
                  href="/"
                  className="mt-8 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-gold transition-colors hover:text-gold-deep"
                >
                  Return home <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            )}

            {!loading && !error && !policy && (
              <div className="py-16 text-center">
                <p className="font-display italic text-[18px] text-brand-black/70">
                  This policy is being prepared. Please check back soon.
                </p>
                <Link
                  href="/"
                  className="mt-8 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-gold transition-colors hover:text-gold-deep"
                >
                  Return home <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            )}

            {!loading && policy?.content && (
              <Reveal>
                <article
                  className="
                    [&_h2]:font-display [&_h2]:text-2xl md:[&_h2]:text-3xl [&_h2]:text-brand-black [&_h2]:mt-10 [&_h2]:mb-3
                    [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-brand-black [&_h3]:mt-8 [&_h3]:mb-2
                    [&_p]:text-[15px] [&_p]:leading-[1.85] [&_p]:text-brand-black/75 [&_p]:mb-4
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-brand-black/75 [&_ul]:mb-4 [&_li]:mb-2
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-brand-black/75 [&_ol]:mb-4
                    [&_a]:text-gold [&_a]:underline [&_a:hover]:text-gold-deep
                    [&_strong]:text-brand-black [&_strong]:font-medium
                    [&_em]:font-display [&_em]:italic
                  "
                  {...richHtml(policy.content)}
                />
              </Reveal>
            )}
          </div>
        </section>
      </main>
    </SeoWrapper>
  )
}