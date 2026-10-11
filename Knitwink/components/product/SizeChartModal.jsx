'use client'

import { Modal } from '@/components/ui/Modal'
import { SIZE_GUIDE } from '@/lib/sizeGuide'

// Size chart dialog. Rows come from lib/sizeGuide.js; the parent only offers the
// link when there are rows, so this never renders an empty chart. Wraps Knitwink's
// shared Modal (focus trap, body-scroll lock, Escape to close) for consistency.
export default function SizeChartModal({ onClose }) {
  return (
    <Modal open onClose={onClose} title="Size chart">
      {SIZE_GUIDE.note && (
        <p className="mb-4 text-sm leading-relaxed text-gray-600">{SIZE_GUIDE.note}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-gray-200 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-500">Size</th>
              <th className="border-b border-gray-200 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-500">Fits</th>
              <th className="border-b border-gray-200 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-500">Foot length</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE.rows.map((r) => (
              <tr key={r.size}>
                <td className="border-b border-gray-100 px-2.5 py-3 font-bold text-brand-black">{r.size}</td>
                <td className="border-b border-gray-100 px-2.5 py-3 text-gray-700">{r.fits}</td>
                <td className="border-b border-gray-100 px-2.5 py-3 text-gray-700">{r.foot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {SIZE_GUIDE.tip && (
        <p className="mt-4 text-sm leading-relaxed text-gray-600">{SIZE_GUIDE.tip}</p>
      )}
    </Modal>
  )
}
