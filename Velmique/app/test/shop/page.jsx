import ShopGrid from '../_components/ShopGrid';

export const metadata = {
  title: 'Shop — Velmique Maison de Parfum',
  description: 'Explore the full VELMIQUE fragrance collection — handcrafted eau de parfum for every you.',
};

export default function MaisonShop() {
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">The collection</span>
        <h1>Signature Scents.</h1>
        <p>Distinctly crafted, unmistakably you — explore every VELMIQUE fragrance.</p>
      </section>
      <ShopGrid />
    </>
  );
}
