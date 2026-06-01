import Home from "./home";
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('home', ctx) } };
}

export default function MainPage({ seoData }) {
  return (
    <SeoWrapper pageName="home" seoData={seoData}>
      <Home />
    </SeoWrapper>
  );
}
