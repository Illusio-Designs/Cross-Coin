'use client';

import Script from 'next/script';
import { trackPageView } from '@/utils/pixel';
import GoogleTagManager from '../GoogleTagManager';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useConsent } from '@/lib/consent';

/**
 * Storefront analytics + ad tracking — runtime configuration.
 *
 * Fetches tracking IDs from the backend's /api/public/tracking-config
 * endpoint so the operations team can rotate keys without redeploying.
 * Renders nothing if no IDs are configured for this brand.
 *
 * Loaded scripts (only when an ID is present):
 *   - GA4 (Google Analytics 4)
 *   - Facebook Pixel
 *   - Microsoft Clarity
 *
 * Add the component once near the bottom of <body> in app/layout.jsx:
 *
 *   <Analytics />
 *
 * Imports stay zero-cost when no IDs are configured — the `next/script`
 * tags don't render and no network calls are made.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink';

export default function Analytics() {
  const [cfg, setCfg] = useState(null);
  const consent = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/public/tracking-config`, {
          headers: { 'X-Brand-Name': BRAND },
        });
        if (!r.ok) return;
        const json = await r.json();
        if (!cancelled) setCfg(json?.data || json || {});
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const gtmId = cfg?.gtm_id;
  const ga4Id = cfg?.ga_measurement_id;
  const fbPixelId = cfg?.fb_pixel_id;
  const clarityId = cfg?.clarity_id;

  useEffect(() => {
    if (ga4Id) trackPageView(pathname);
  }, [ga4Id, pathname]);

  return (
    <>
      <GoogleTagManager containerId={gtmId} />
      {ga4Id && (
        <>
          <Script
            id="ga4-loader"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          />
          <Script
            id="ga4-init"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', { transport_type: 'beacon', send_page_view: false });
              window.__brandGa4Ready = true;
              window.dispatchEvent(new Event('brand-ga4-ready'));
              `,
            }}
          />
        </>
      )}

      {fbPixelId && consent.marketing && (
        <Script
          id="fb-pixel-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              window._fbqId='${fbPixelId}';fbq('init', '${fbPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {clarityId && consent.analytics && (
        <Script
          id="clarity-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `,
          }}
        />
      )}
    </>
  );
}
