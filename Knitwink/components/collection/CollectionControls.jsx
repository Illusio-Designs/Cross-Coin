'use client';

import { Suspense } from 'react';
import { FilterBar } from './FilterBar';
import { FilterDrawer } from './FilterDrawer';
import { SortDropdown } from './SortDropdown';

export function CollectionControls() {
  return (
    <Suspense>
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-6">
        {/* Desktop filters */}
        <div className="hidden md:block">
          <FilterBar />
        </div>
        {/* Mobile filter drawer trigger */}
        <FilterDrawer />
        {/* Sort */}
        <SortDropdown />
      </div>
    </Suspense>);

}