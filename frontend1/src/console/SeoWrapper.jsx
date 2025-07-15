import React, { useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { usePathname } from 'next/navigation';
import { seoService } from '../services/index';
import Head from 'next/head';

const SeoWrapper = ({ pageName, children, fallbackSeo = null, seo }) => {
    const [seoData, setSeoData] = useState({
        meta_title: 'Cross-Coin - Your Trusted Shopping Partner',
        meta_description: 'Discover amazing products at Cross-Coin, your one-stop shop for all your needs.',
        meta_keywords: 'cross-coin, shopping, online store, products',
        canonical_url: typeof window !== 'undefined' ? window.location.href : '',
        meta_image: null,
    });

    const pathname = usePathname();

    useEffect(() => {
        const fetchSeoData = async () => {
            try {
                let response;
                
                // If pageName is provided, fetch SEO data for that specific page
                if (pageName) {
                    response = await seoService.getSEOData(pageName);
                } else {
                    // Try to determine page name from current path
                    const pathSegments = pathname.split('/').filter(Boolean);
                    const currentPageName = pathSegments[0] || 'home';
                    response = await seoService.getSEOData(currentPageName);
                }

                // Accept both {success, data} and direct SEO object
                const data = response && response.data ? response.data : response;
                setSeoData(prev => ({
                    ...prev,
                    meta_title: data.meta_title || data.metaTitle || prev.meta_title,
                    meta_description: data.meta_description || data.metaDescription || prev.meta_description,
                    meta_keywords: data.meta_keywords || data.metaKeywords || prev.meta_keywords,
                    canonical_url: data.canonical_url || data.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : ''),
                    meta_image: data.meta_image || data.ogImage || prev.meta_image,
                }));
            } catch (error) {
                console.error('Error fetching SEO data:', error);
                
                // Use fallback SEO data if provided
                if (fallbackSeo) {
                    setSeoData(prev => ({
                        ...prev,
                        ...fallbackSeo,
                        canonical_url: fallbackSeo.canonical_url || (typeof window !== 'undefined' ? window.location.href : '')
                    }));
                } else {
                    // Set default SEO data based on current page
                    const pathSegments = pathname.split('/').filter(Boolean);
                    const currentPageName = pathSegments[0] || 'home';
                    
                    setSeoData(prev => ({
                        ...prev,
                        meta_title: `${currentPageName.charAt(0).toUpperCase() + currentPageName.slice(1)} - Cross-Coin`,
                        meta_description: `Explore ${currentPageName} at Cross-Coin, your trusted shopping partner.`,
                        meta_keywords: `${currentPageName}, cross-coin, shopping, online store`,
                        canonical_url: typeof window !== 'undefined' ? window.location.href : ''
                    }));
                }
            }
        };

        fetchSeoData();
    }, [pageName, pathname, fallbackSeo]);

    // Generate full image URL if meta_image exists
    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${imagePath}`;
    };

    const fullImageUrl = getFullImageUrl(seoData.meta_image);

    const meta = seo || {};

    return (
        <>
            <Head>
                <title>{meta.metaTitle || pageName || 'Cross Coin'}</title>
                {meta.metaDescription && <meta name="description" content={meta.metaDescription} />}
                {meta.metaKeywords && <meta name="keywords" content={meta.metaKeywords} />}
                {meta.ogTitle && <meta property="og:title" content={meta.ogTitle} />}
                {meta.ogDescription && <meta property="og:description" content={meta.ogDescription} />}
                {meta.ogImage && <meta property="og:image" content={meta.ogImage} />}
                {meta.canonicalUrl && <link rel="canonical" href={meta.canonicalUrl} />}
            </Head>
            <HelmetProvider>
                <Helmet>
                    <title>{seoData.meta_title}</title>
                    <meta name="description" content={seoData.meta_description} />
                    <meta name="keywords" content={seoData.meta_keywords} />
                    <link rel="canonical" href={seoData.canonical_url} />
                    
                    {/* Open Graph tags */}
                    <meta property="og:title" content={seoData.meta_title} />
                    <meta property="og:description" content={seoData.meta_description} />
                    <meta property="og:url" content={seoData.canonical_url} />
                    <meta property="og:type" content="website" />
                    {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
                    
                    {/* Twitter Card tags */}
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content={seoData.meta_title} />
                    <meta name="twitter:description" content={seoData.meta_description} />
                    {fullImageUrl && <meta name="twitter:image" content={fullImageUrl} />}
                    
                    {/* Additional meta tags */}
                    <meta name="robots" content="index, follow" />
                    <meta name="author" content="Cross-Coin" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </Helmet>
            </HelmetProvider>
            {children}
        </>
    );
};

export default SeoWrapper; 