import Head from 'next/head';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Categories from '../components/Categories';
import FeaturedProducts from '../components/FeaturedProducts';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Head>
        <title>KNITWINK - Luxury in Every Step</title>
        <meta name="description" content="Experience unparalleled comfort and style with KNITWINK premium socks collection" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main>
        <Hero />
        <Features />
        <Categories />
        <FeaturedProducts />
      </main>
      <Footer />
    </>
  );
}
