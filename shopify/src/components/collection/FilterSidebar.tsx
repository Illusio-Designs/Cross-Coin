'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function FilterSidebar() {
  const [openSections, setOpenSections] = useState<string[]>(['price', 'size', 'color', 'category'])

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="border-b pb-6">
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
              <span>Under $20</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>$20 - $30</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>$30 - $40</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Over $40</span>
            </label>
          </div>
        )}
      </div>

      {/* Size */}
      <div className="border-b pb-6">
        <button
          onClick={() => toggleSection('size')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Size</span>
          {openSections.includes('size') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('size') && (
          <div className="space-y-3">
            {['S', 'M', 'L', 'XL'].map((size) => (
              <label key={size} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{size}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Color */}
      <div className="border-b pb-6">
        <button
          onClick={() => toggleSection('color')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Color</span>
          {openSections.includes('color') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('color') && (
          <div className="space-y-3">
            {['Black', 'White', 'Gray', 'Navy', 'Brown'].map((color) => (
              <label key={color} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{color}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <div className="border-b pb-6">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Category</span>
          {openSections.includes('category') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('category') && (
          <div className="space-y-3">
            {['Athletic', 'Casual', 'Formal', 'Winter', 'Compression', 'No-Show'].map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Material */}
      <div className="pb-6">
        <button
          onClick={() => toggleSection('material')}
          className="flex items-center justify-between w-full mb-4 font-bold"
        >
          <span>Material</span>
          {openSections.includes('material') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {openSections.includes('material') && (
          <div className="space-y-3">
            {['Cotton', 'Wool', 'Merino', 'Synthetic', 'Bamboo'].map((material) => (
              <label key={material} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>{material}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
