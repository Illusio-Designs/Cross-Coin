import Link from 'next/link';
import Icon from '@/components/Icon';

export default function SearchCategories({ chips = [] }) {
  return (
    <section className="container" style={{ marginTop: 8 }}>
      <div className="searchbar">
        <form className="search-input" action="/search" method="get">
          <Icon name="Search" size={18} color="#6a7186" />
          <input name="q" placeholder="Search by style, metal or gemstone…" aria-label="Search products" />
          <button className="go" aria-label="Search" type="submit"><Icon name="Search" size={16} /></button>
        </form>
        <div className="chips">
          {chips.map((c) => (
            <Link className="chip" key={c.label} href={c.slug === 'all' ? '/products' : `/collections/${c.slug}`}>
              <Icon name={c.icon} size={15} /> {c.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
