'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

const SIZE_DATA = {
  mens: [
  { uk: '6', eu: '39', us: '7' },
  { uk: '7', eu: '40', us: '8' },
  { uk: '8', eu: '41', us: '9' },
  { uk: '9', eu: '42', us: '10' },
  { uk: '10', eu: '43', us: '11' },
  { uk: '11', eu: '44', us: '12' },
  { uk: '12', eu: '45', us: '13' }],

  womens: [
  { uk: '3', eu: '36', us: '5' },
  { uk: '4', eu: '37', us: '6' },
  { uk: '5', eu: '38', us: '7' },
  { uk: '6', eu: '39', us: '8' },
  { uk: '7', eu: '40', us: '9' },
  { uk: '8', eu: '41', us: '10' }]

};





export function SizeGuide({ gender = 'mens' }) {
  const [open, setOpen] = useState(false);
  const rows = SIZE_DATA[gender];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-600 underline underline-offset-4 transition-colors duration-150 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
        
        Size Guide
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Size Guide">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['UK', 'EU', 'US'].map((h) =>
                <th key={h} className="pb-3 text-left text-xs font-medium uppercase tracking-widest text-gray-600">
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
              <tr key={row.uk} className="border-b border-gray-100">
                  <td className="py-3 text-gray-800">{row.uk}</td>
                  <td className="py-3 text-gray-800">{row.eu}</td>
                  <td className="py-3 text-gray-800">{row.us}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-gray-600">
          If you&apos;re between sizes, we recommend sizing up for a more comfortable fit.
        </p>
      </Modal>
    </>);

}