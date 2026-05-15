/* Filter drawer — slides in from the right (Crosscoin pattern, Gripzus
   design). Category, price range, size. Prop-driven & controlled. */

const SIZES = ['S', 'M', 'L', 'XL'];

export default function FilterDrawer({
  open, onClose,
  categories = [],
  draft, setDraft,
  onApply, onClear,
  resultCount = 0,
}) {
  const toggleCat = (value) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(value)
        ? d.categories.filter((c) => c !== value)
        : [...d.categories, value],
    }));
  };
  const toggleSize = (s) => {
    setDraft((d) => ({
      ...d,
      sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s],
    }));
  };

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[61] w-[92%] max-w-[400px] bg-paper flex flex-col shadow-card transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Filter products"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="h-display text-xl text-ink">Refine</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-ink hover:text-clay transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-9">
          {/* Category */}
          <div>
            <p className="eyebrow mb-4">Category</p>
            <div className="space-y-1">
              {categories.map((c) => {
                const checked = draft.categories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCat(c.value)}
                    className="flex w-full items-center gap-3 py-1.5 text-left group"
                  >
                    <span className={`w-[18px] h-[18px] rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                      checked ? 'bg-ink border-ink' : 'border-line group-hover:border-ink'
                    }`}>
                      {checked && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </span>
                    <span className={`text-sm transition-colors ${checked ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="eyebrow mb-4">Price range</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-ink-muted block mb-1">Min</label>
                <input
                  type="number" min={0} value={draft.priceMin}
                  onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))}
                  className="w-full border border-line focus:border-ink outline-none px-3 py-2.5 text-sm transition-colors"
                />
              </div>
              <span className="text-ink-muted mt-5">—</span>
              <div className="flex-1">
                <label className="text-[11px] text-ink-muted block mb-1">Max</label>
                <input
                  type="number" min={0} value={draft.priceMax}
                  onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                  className="w-full border border-line focus:border-ink outline-none px-3 py-2.5 text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <p className="eyebrow mb-4">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className={`min-w-[3rem] px-3 py-2 text-[12px] font-medium border rounded transition-colors ${
                    draft.sizes.includes(s) ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-line px-6 py-4 flex items-center gap-3">
          <button onClick={onClear} className="btn-outline flex-1">Clear</button>
          <button onClick={onApply} className="btn flex-1">Show {resultCount}</button>
        </div>
      </aside>
    </>
  );
}
