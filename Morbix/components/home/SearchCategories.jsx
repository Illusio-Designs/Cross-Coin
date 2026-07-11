import Icon from '@/components/Icon';

export default function SearchCategories({ chips = [] }) {
  return (
    <section className="container" style={{ marginTop: 8 }}>
      <div className="searchbar">
        <div className="search-input">
          <Icon name="Search" size={18} color="#6a7186" />
          <input placeholder="Search by style, size or technology…" aria-label="Search products" />
          <button className="go" aria-label="Search"><Icon name="Search" size={16} /></button>
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button className="chip" key={c.label}>
              <Icon name={c.icon} size={15} /> {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
