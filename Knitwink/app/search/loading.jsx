import { Search } from 'lucide-react';
import { DarkHeroSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

// Search: the black hero (real title, search box shape) and the result grid.
export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <DarkHeroSkeleton title="Search">
        <div className="relative mx-auto mt-6 max-w-xl" aria-hidden="true">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
          <div className="w-full rounded-full border border-white/15 bg-white/10 py-4 pl-12 pr-12 text-left text-sm text-white/35">Search socks, colours, packs…</div>
        </div>
      </DarkHeroSkeleton>
      <div className="px-6 py-8 md:px-10">
        <ProductGridSkeleton count={10} label="Loading results…" />
      </div>
    </div>
  );
}
