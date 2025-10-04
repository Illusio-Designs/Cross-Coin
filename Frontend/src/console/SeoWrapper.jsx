import React, { useEffect, useState, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import { getSeoByPageName } from '../services/publicindex';
import Head from 'next/head';

const SeoWrapper = ({ pageName, children, seoData }) => {
    const router = useRouter();
    const [seoDataState, setSeoDataState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    const defaultSeoData = {
        meta_title: 'Cross-Coin - Your Trusted Shopping Partner',
        meta_description: 'Discover amazing products at Cross-Coin, your one-stop shop for all your needs.',
        meta_keywords: 'cross-coin, shopping, online store, products',
        canonical_url: typeof window !== 'undefined' ? window.location.href : '',
        meta_image: null,
    };

    // Fetch SEO data automatically if not provided
    useEffect(() => {
        const fetchSeoData = async () => {
            if (seoData || hasFetchedRef.current || !pageName) {
                return;
            }

            try {
                setIsLoading(true);
                hasFetchedRef.current = true;
                console.log(`Fetching SEO data for page: ${pageName}`);
                const data = await getSeoByPageName(pageName);
                console.log(`SEO data for ${pageName}:`, data);
                setSeoDataState(data);
            } catch (error) {
                console.error(`Error fetching SEO data for ${pageName}:`, error);
                // Check if it's a 404 (SEO data not found) - this is normal
                if (error.message && error.message.includes('not found')) {
                    console.log(`No SEO data found for ${pageName}, using default`);
                }
                // Use default data on error (including 404)
                setSeoDataState(defaultSeoData);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSeoData();
    }, [pageName, seoData]);

    // Use provided seoData, fetched seoData, or default
    const data = seoData || seoDataState || defaultSeoData;
    // Generate full image URL if meta_image exists
    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${imagePath}`;
    };
    const fullImageUrl = getFullImageUrl(data.meta_image);
    return (
        <>
            <Head>
                <title>{data.meta_title || pageName || 'Cross Coin'}</title>
                <meta name="description" content={data.meta_description} />
                <meta name="keywords" content={data.meta_keywords} />
                <link rel="canonical" href={data.canonical_url} />
                {/* Open Graph tags */}
                <meta property="og:title" content={data.meta_title} />
                <meta property="og:description" content={data.meta_description} />
                <meta property="og:url" content={data.canonical_url} />
                <meta property="og:type" content="website" />
                {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
                {/* Twitter Card tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={data.meta_title} />
                <meta name="twitter:description" content={data.meta_description} />
                {fullImageUrl && <meta name="twitter:image" content={fullImageUrl} />}
                {/* Additional meta tags */}
                <meta name="robots" content="index, follow" />
                <meta name="author" content="Cross-Coin" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>
            {children}
        </>
    );
};

export default SeoWrapper; 