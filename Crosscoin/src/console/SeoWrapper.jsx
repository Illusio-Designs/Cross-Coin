import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import { getSeoByPageName } from '../services/publicApi';
import Head from 'next/head';

// Retired mixed-case page paths (redirected 301 by the middleware). A saved
// canonical that still uses one points at its current lowercase path.
const LEGACY_PATHS = {
    '/Products': '/products', '/Collections': '/collections', '/Wishlist': '/wishlist',
    '/SearchResults': '/search', '/OrderTracking': '/track-order', '/Contact': '/contact', '/About': '/about',
};
const currentCanonicalPath = (path) => {
    const clean = String(path || '/').split(/[?#]/)[0] || '/';
    return LEGACY_PATHS[clean] || clean;
};

const SeoWrapper = ({ pageName, children, seoData, organizationLd = null, fallbackOgImage = null, fallbackDescription = null }) => {
    const router = useRouter();
    // This page's own path (no query) — known on the server too, unlike
    // window.location, so the server-rendered canonical is the real page.
    const pagePath = currentCanonicalPath(router?.asPath);
    const [seoDataState, setSeoDataState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    const defaultSeoData = useMemo(() => {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
        return {
            meta_title: 'Cross-Coin - Your Trusted Shopping Partner',
            meta_description: 'Discover amazing products at Cross-Coin, your one-stop shop for all your needs.',
            meta_keywords: 'cross-coin, shopping, online store, products',
            canonical_url: `${baseUrl}${pagePath}`,
            meta_image: null,
        };
    }, [pagePath]);

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
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.crosscoin.in';
        if (!url) {
            // If no URL provided, use this page's own path
            return `${baseUrl}${pagePath}`;
        }

        // Absolute URL: keep it, but move a retired mixed-case path to its current one
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const u = new URL(url);
                const moved = LEGACY_PATHS[u.pathname];
                if (moved) u.pathname = moved;
                return u.toString();
            } catch {
                return url;
            }
        }

        // If relative URL, make it absolute
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${currentCanonicalPath(cleanUrl)}${cleanUrl.includes('?') ? cleanUrl.slice(cleanUrl.indexOf('?')) : ''}`;
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
