'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function FilterSidebar() {
  const [openSections, setOpenSections] = useState<string[]>(['price', 'category', 'material'])

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="border-b border-gold/20 pb-6">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Price</span>
          {openSections.includes('price') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('price') && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Under $2,000</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>$2,000 - $5,000</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>$5,000 - $10,000</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Over $10,000</span>
            </label>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="border-b border-gold/20 pb-6">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Category</span>
          {openSections.includes('category') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('category') && (
          <div className="space-y-3">
            {['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Watches', 'Wedding'].map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Material */}
      <div className="border-b border-gold/20 pb-6">
        <button
          onClick={() => toggleSection('material')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Material</span>
          {openSections.includes('material') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('material') && (
          <div className="space-y-3">
            {['18K Yellow Gold', '18K White Gold', '18K Rose Gold', 'Platinum', 'Sterling Silver'].map((material) => (
              <label key={material} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{material}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Gemstone */}
      <div className="pb-6">
        <button
          onClick={() => toggleSection('gemstone')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Gemstone</span>
          {openSections.includes('gemstone') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('gemstone') && (
          <div className="space-y-3">
            {['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Pearl'].map((gem) => (
              <label key={gem} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{gem}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
