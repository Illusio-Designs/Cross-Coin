import ShopGrid from '../_components/ShopGrid';

export const metadata = {
  title: 'Shop — Velmique Maison de Parfum',
  description: 'Explore the full VELMIQUE fragrance collection — handcrafted eau de parfum for every you.',
};

export default function MaisonShop({ searchParams }) {
  const note = (searchParams?.note || '').toString();
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">The collection</span>
        <h1>{note ? <>Scents with <em style={{ color: 'var(--m-accent-deep)' }}>{note}</em>.</> : 'Signature Scents.'}</h1>
        <p>{note ? `Every VELMIQUE fragrance carrying a ${note} note.` : 'Distinctly crafted, unmistakably you — explore every VELMIQUE fragrance.'}</p>
      </section>
      <ShopGrid note={note} />
    </>
  );
}
