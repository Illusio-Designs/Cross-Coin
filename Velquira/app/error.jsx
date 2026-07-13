'use client';

import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset



}) {
  return (
    <section className="bg-cream">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-display text-3xl font-normal text-brand-black">Something went wrong</h1>
        <p className="text-base leading-relaxed text-gray-600">
          {error.message ?? 'An unexpected error occurred.'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </section>);

}