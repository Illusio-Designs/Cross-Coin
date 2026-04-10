import { Leaf } from 'lucide-react';





export function CarbonBadge({ kg }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
      <Leaf size={12} className="text-sage" aria-hidden="true" />
      <span className="text-xs font-medium uppercase tracking-widest text-gray-800">
        {kg.toFixed(1)}kg CO₂e
      </span>
    </div>);

}