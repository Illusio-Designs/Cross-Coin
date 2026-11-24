import Link from 'next/link';
import { Leaf } from '@/components/ui/BrandIcon';
import NotePhoto from '@/components/product/NotePhoto';
import { noteKey, productNotes } from '@/lib/api/products';

export default function ShopByNotes({ products }) {
  const notes = new Map();
  for (const product of products) {
    for (const { name, image } of productNotes(product)) {
      const key = noteKey(name);
      const note = notes.get(key) || { name, image: '', count: 0 };
      if (!note.image && image) note.image = image;
      note.count++;
      notes.set(key, note);
    }
  }

  if (!notes.size) return null;
  const sorted = [...notes.entries()].sort(([, a], [, b]) => (
    Number(Boolean(b.image)) - Number(Boolean(a.image)) || b.count - a.count || a.name.localeCompare(b.name, 'en-IN')
  ));

  return (
    <section className="v-section m-wrap v-shop-notes" id="shop-by-notes" aria-labelledby="shop-notes-heading">
      <div className="v-heading">
        <h2 id="shop-notes-heading">Shop by Notes</h2>
        <Link href="/shop">Explore All Fragrances →</Link>
      </div>
      <ul className="v-shop-notes__list">
        {sorted.map(([key, { name, image }]) => (
          <li key={key}>
            <Link className="v-shop-notes__card" href={{ pathname: '/shop', query: { note: name } }} prefetch={false}>
              <span className="v-shop-notes__photo">
                {image ? <NotePhoto image={image} width={320} widths={[160, 240, 320, 480, 600]}
                  sizes="(max-width: 740px) calc(50vw - 24px), (max-width: 1280px) 24vw, 300px" natural={false} />
                  : <Leaf size={32} strokeWidth={1.25} aria-hidden="true" />}
              </span>
              <span className="v-shop-notes__label">{name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
