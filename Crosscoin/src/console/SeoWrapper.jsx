import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import { getSeoByPageName } from '../services/publicApi';
import Head from 'next/head';

const SeoWrapper = ({ pageName, children, seoData, organizationLd = null, fallbackOgImage = null, fallbackDescription = null }) => {
    const router = useRouter();
    const [seoDataState, setSeoDataState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    const defaultSeoData = useMemo(() => {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
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
            const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
            return `${baseUrl}${currentPath}`;
        }
        
        // If already absolute URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // If relative URL, make it absolute
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${cleanUrl}`;
    };
    
    // Non-overwriting brand fallbacks: only fill in when the page's own
    // SeoMetadata leaves the field empty. Page data always wins.
    const metaDescription = data.meta_description || fallbackDescription || undefined;
    const fullImageUrl = getFullImageUrl(data.meta_image) || getFullImageUrl(fallbackOgImage);
    const canonicalUrl = getAbsoluteCanonicalUrl(data.canonical_url);
    const ogTitle = data.og_title || data.meta_title;
    const ogDescription = data.og_description || metaDescription;
    return (
        <>
            <Head>
                <title>{data.meta_title || pageName || 'Cross Coin'}</title>
                <meta name="description" content={metaDescription} />
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
                {/* Additional meta tags. Robots is per-page when admin set it
                    (e.g. 'noindex, follow' on Wishlist/Profile/OrderTracking/
                    ThankYou); falls back to indexable + image-friendly default. */}
                <meta name="robots" content={data.robots || 'index, follow, max-image-preview:large'} />
                <meta name="author" content="Cross-Coin" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                {/* Structured Data (JSON-LD).
                    Priority: admin-supplied SeoMetadata.structured_data → page-specific
                    default (only home gets one — Organization + WebSite). Other pages
                    rely on their own routes (products / blog / collections) for
                    page-type JSON-LD, or skip entirely.
                */}
                {data.structured_data ? (
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: typeof data.structured_data === 'string'
                                ? data.structured_data
                                : JSON.stringify(data.structured_data),
                        }}
                    />
                ) : (pageName === 'home' && (
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeDefaultLd(canonicalUrl, fullImageUrl, organizationLd)) }}
                    />
                ))}
            </Head>
            {children}
        </>
    );
};

/**
 * Default JSON-LD for the home page when admin hasn't supplied a custom
 * structured_data in the SEO table. Combines Organization and WebSite —
 * Google uses these for the sitelinks search box and the brand panel in
 * search results.
 *
 * When a per-brand Organization object is supplied (fetched server-side from
 * the backend's /api/public/seo-org), it REPLACES the hardcoded Organization
 * block while the WebSite block is kept unchanged. Falls back to the default
 * Organization when `organizationLd` is null (backend down / not configured).
 */
function buildHomeDefaultLd(canonicalUrl, fullImageUrl, organizationLd = null) {
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
    const organization = organizationLd
        // Ensure @context is present even if the backend omitted it; the
        // object's own @context (if any) wins over the default via spread.
        ? { '@context': 'https://schema.org', ...organizationLd }
        : {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'CrossCoin',
            url: baseUrl,
            logo: fullImageUrl || `${baseUrl}/assets/crosscoin_logo.webp`,
        };
    return [
        organization,
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'CrossCoin',
            url: baseUrl,
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/SearchResults?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
            },
        },
    ];
}

export default SeoWrapper; 
