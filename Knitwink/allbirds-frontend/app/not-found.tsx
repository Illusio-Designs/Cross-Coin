import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-9xl font-normal text-gray-200">404</p>
      <h1 className="font-display text-3xl font-normal text-brand-black">Page not found</h1>
      <p className="text-base leading-relaxed text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
        >
          Go Home
        </Link>
        <Link
          href="/collections/all"
          className="text-sm text-brand-black underline underline-offset-4 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
        >
          Shop All
        </Link>
      </div>
    </div>
  )
}
