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
        <title>GRIPZUS - Ultimate Grip Solutions</title>
        <meta name="description" content="Experience superior grip and control with GRIPZUS premium grip solutions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
        <link rel="shortcut icon" href="/Gripzusfavicon.jpeg" />
        <link rel="apple-touch-icon" href="/Gripzusfavicon.jpeg" />
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