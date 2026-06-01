import React from "react";
import InstagramGallery from "../components/common/InstagramGallery";
import SeoWrapper from "../console/SeoWrapper";
import { fetchPageSeo } from "../utils/fetchPageSeo";

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('instagram', ctx) } };
}

const InstagramPage = ({ seoData }) => {
  return (
    <SeoWrapper pageName="instagram" seoData={seoData}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <InstagramGallery />
      </div>
    </SeoWrapper>
  );
};

export default InstagramPage;
