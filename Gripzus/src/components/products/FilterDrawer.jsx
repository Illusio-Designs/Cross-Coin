/* Filter drawer — slides in from the right (Crosscoin pattern, Gripzus
   design). Price range · Size · Colour. Options are dynamic — derived
   from the actual products on the page. Prop-driven & controlled. */

export default function FilterDrawer({
  open, onClose,
  draft, setDraft,
  onApply, onClear,
  resultCount = 0,
  sizeOptions = [],
  colorOptions = [],
  categories = [],
  activeCat = 'all',
  onSelectCollection,
}) {
  const toggleSize = (s) => {
    setDraft((d) => ({
      ...d,
      sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s],
    }));
  };
  const toggleColor = (name) => {
    setDraft((d) => ({
      ...d,
      colors: d.colors.includes(name) ? d.colors.filter((x) => x !== name) : [...d.colors, name],
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
      <div className="fixed inset-0 z-[61] overflow-hidden pointer-events-none">
      <aside
        className={`absolute inset-y-0 right-0 w-[92%] max-w-[400px] bg-paper flex flex-col shadow-card transition-transform duration-300 ease-out pointer-events-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Filter products"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="h-display text-xl text-ink">Refine</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-ink hover:text-ink-soft transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-9">

          {/* Collection — mobile only (desktop uses the toolbar chips) */}
          {categories.length > 0 && onSelectCollection && (
            <div className="lg:hidden">
              <p className="eyebrow mb-4">Collection</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCollection('all')}
                  className={`px-3.5 py-2 text-[12px] tracking-[0.04em] border rounded-full transition-colors ${
                    activeCat === 'all' ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                  }`}
                >
                  All
                </button>
                {categories.map((c) => {
                  const key = c.slug || c.name;
                  return (
                    <button
                      key={c.id ?? key}
                      type="button"
                      onClick={() => onSelectCollection(key)}
                      className={`px-3.5 py-2 text-[12px] tracking-[0.04em] border rounded-full transition-colors ${
                        activeCat === key ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price */}
          <div>
            <p className="eyebrow mb-4">Price range</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-ink-muted block mb-1">Min ₹</label>
                <input
                  type="number" min={0} value={draft.priceMin} placeholder="0"
                  onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))}
                  className="w-full border border-line focus:border-ink outline-none px-3 py-2.5 text-sm rounded-sm transition-colors"
                />
              </div>
              <span className="text-ink-muted mt-5">—</span>
              <div className="flex-1">
                <label className="text-[11px] text-ink-muted block mb-1">Max ₹</label>
                <input
                  type="number" min={0} value={draft.priceMax} placeholder="Any"
                  onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                  className="w-full border border-line focus:border-ink outline-none px-3 py-2.5 text-sm rounded-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          {sizeOptions.length > 0 && (
            <div>
              <p className="eyebrow mb-4">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`min-w-[3rem] px-3 py-2 text-[12px] font-medium border rounded-sm transition-colors ${
                      draft.sizes.includes(s) ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colour */}
          {colorOptions.length > 0 && (
            <div>
              <p className="eyebrow mb-4">Colour</p>
              <div className="space-y-1">
                {colorOptions.map((c) => {
                  const checked = draft.colors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleColor(c.name)}
                      className="flex w-full items-center gap-3 py-1.5 text-left group"
                    >
                      <span
                        className={`w-5 h-5 rounded-full ring-1 ring-offset-1 ring-offset-paper transition-all ${
                          checked ? 'ring-ink' : 'ring-line group-hover:ring-ink'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className={`text-sm transition-colors ${checked ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}`}>
                        {c.name}
                      </span>
                      {checked && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-ink"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-6 py-4 flex items-center gap-3">
          <button onClick={onClear} className="btn-outline flex-1">Clear</button>
          <button onClick={onApply} className="btn flex-1">Show {resultCount}</button>
        </div>
      </aside>
      </div>
    </>
  );
}
