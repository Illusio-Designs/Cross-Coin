'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Analytics — GA4 + Meta Pixel + Microsoft Clarity, driven by the platform
 * tracking-config (Brand Settings), matching the Crosscoin storefront.
 *
 * IDs are fetched from /api/public/tracking-config at runtime, scoped to this
 * brand via the X-Brand-Name header, so changing GA_MEASUREMENT_ID /
 * FB_PIXEL_ID / CLARITY_ID in the dashboard takes effect on the next page
 * load — no redeploy or build-time env var required.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || '';

export default function Analytics() {
  const [cfg, setCfg] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return;
    let aborted = false;
    fetch(`${API_URL}/api/public/tracking-config`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => {
        if (aborted || !d?.success) return;
        setCfg({
          gaId: d.ga_measurement_id || null,
          fbId: d.fb_pixel_id || null,
          clarityId: d.clarity_id || null,
        });
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, []);

  // Fire a page_view / PageView on client-side route changes.
  useEffect(() => {
    if (!cfg || typeof window === 'undefined') return;
    if (cfg.gaId && window.gtag) window.gtag('event', 'page_view', { page_path: pathname });
    if (cfg.fbId && window.fbq) window.fbq('track', 'PageView');
  }, [pathname, cfg]);

  if (!cfg) return null;
  const { gaId, fbId, clarityId } = cfg;

  return (
    <>
      {fbId && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbId}');
              fbq('track', 'PageView');
            ` }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: 'none' }} alt=""
              src={`https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}

      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false });
              gtag('event', 'page_view', { page_path: window.location.pathname });
            ` }}
          />
        </>
      )}

      {clarityId && (
        <Script id="ms-clarity" strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          ` }}
        />
      )}
    </>
  );
}
