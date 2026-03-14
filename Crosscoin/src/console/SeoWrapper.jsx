import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import { getSeoByPageName } from '../services/publicApi';
import Head from 'next/head';

const SeoWrapper = ({ pageName, children, seoData }) => {
    const router = useRouter();
    const [seoDataState, setSeoDataState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    const defaultSeoData = useMemo(() => {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://crosscoin.in';
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        return {
            meta_title: 'Cross-Coin - Your Trusted Shopping Partner',
            meta_description: 'Discover amazing products at Cross-Coin, your one-stop shop for all your needs.',
            meta_keywords: 'cross-coin, shopping, online store, products',
            canonical_url: `${baseUrl}${currentPath}`,
            meta_image: null,
        };
    }, []);

    // Fetch SEO data automatically if not provided
    useEffect(() => {
        const fetchSeoData = async () => {
            if (seoData || hasFetchedRef.current || !pageName) {
                return;
            }

            try {
                setIsLoading(true);
                hasFetchedRef.current = true;
                const data = await getSeoByPageName(pageName);
                setSeoDataState(data);
            } catch (error) {
                // Check if it's a 404 (SEO data not found) - this is normal
                if (error.message && error.message.includes('not found')) {
                    }
                // Use default data on error (including 404)
                setSeoDataState(defaultSeoData);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSeoData();
    }, [pageName, seoData, defaultSeoData]);

    // Use provided seoData, fetched seoData, or default
    const data = seoData || seoDataState || defaultSeoData;
    
    // Generate full image URL if meta_image exists
    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}${imagePath}`;
    };
    
    // Generate absolute canonical URL
    const getAbsoluteCanonicalUrl = (url) => {
        if (!url) {
            // If no URL provided, use current page URL
            const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://crosscoin.in';
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
            return `${baseUrl}${currentPath}`;
        }
        
        // If already absolute URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // If relative URL, make it absolute
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://crosscoin.in';
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${cleanUrl}`;
    };
    
    const fullImageUrl = getFullImageUrl(data.meta_image);
    const canonicalUrl = getAbsoluteCanonicalUrl(data.canonical_url);
    const ogTitle = data.og_title || data.meta_title;
    const ogDescription = data.og_description || data.meta_description;
    return (
        <>
            <Head>
                <title>{data.meta_title || pageName || 'Cross Coin'}</title>
                <meta name="description" content={data.meta_description} />
                <meta name="keywords" content={data.meta_keywords} />
                <link rel="canonical" href={canonicalUrl} />
                {/* Open Graph tags */}
                <meta property="og:title" content={ogTitle} />
                <meta property="og:description" content={ogDescription} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content="website" />
                {fullImageUrl && <meta property="og:image" content={fullImageUrl} />}
                {/* Twitter Card tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={ogTitle} />
                <meta name="twitter:description" content={ogDescription} />
                {fullImageUrl && <meta name="twitter:image" content={fullImageUrl} />}
                {/* Additional meta tags */}
                <meta name="robots" content="index, follow" />
                <meta name="author" content="Cross-Coin" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                
                {/* Structured Data (JSON-LD) */}
                {data.structured_data && (
                    <script type="application/ld+json">
                        {typeof data.structured_data === 'string' 
                            ? data.structured_data 
                            : JSON.stringify(data.structured_data)}
                    </script>
                )}
            </Head>
            {children}
        </>
    );
};

export default SeoWrapper; 
