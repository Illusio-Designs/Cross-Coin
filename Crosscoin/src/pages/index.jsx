import Home from "./home";
import SeoWrapper from '../console/SeoWrapper';
import ProductFaqSection from '../components/common/ProductFaqSection';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { fetchPageFaqs } from '../utils/fetchPageFaqs';

export async function getServerSideProps(ctx) {
  const [seoData, faqs] = await Promise.all([
    fetchPageSeo('home', ctx),
    fetchPageFaqs('home', ctx),
  ]);
  return { props: { seoData, pageFaqs: faqs.pageFaqs, globalFaqs: faqs.globalFaqs } };
}

export default function MainPage({ seoData, pageFaqs = [], globalFaqs = [] }) {
  return (
    <SeoWrapper pageName="home" seoData={seoData}>
      <Home />
      {(pageFaqs.length > 0 || globalFaqs.length > 0) && (
        <section style={{ padding: '0 16px', maxWidth: 1200, margin: '0 auto' }}>
          <ProductFaqSection productFaqs={pageFaqs} globalFaqs={globalFaqs} />
        </section>
      )}
    </SeoWrapper>
  );
}
