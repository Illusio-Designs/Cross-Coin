'use client';

import Script from 'next/script';
import { trackPageView, metaPageView } from '@/utils/pixel';
import GoogleTagManager from '../GoogleTagManager';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useConsent } from '@/lib/consent';

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
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'morbix';

export default function Analytics() {
  const [cfg, setCfg] = useState(null);
  const pathname = usePathname();
  const consent = useConsent();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return;
    let aborted = false;
    fetch(`${API_URL}/api/public/tracking-config`, { cache: 'no-store', headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => {
        if (aborted || !d?.success) return;
        setCfg({
          gtmId: d.gtm_id || null,
          gaId: d.ga_measurement_id || null,
          fbId: d.fb_pixel_id || null,
          clarityId: d.clarity_id || null,
          // Arrived from an ad or a tagged link: GA4 loads at once (below),
          // so short visits from paid traffic are still counted.
          paid: /[?&](gclid|gbraid|wbraid|fbclid|utm_source)=/.test(window.location.search),
        });
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [consent.analytics, consent.marketing]);

  // Fire a page_view / PageView on client-side route changes.
  useEffect(() => {
    if (!cfg || typeof window === 'undefined') return;
    if (cfg.gaId) trackPageView(pathname);
    // Meta PageView for every page, first load included (browser + CAPI copy,
    // one event id); the pixel snippet itself no longer sends one.
    if (consent.marketing && cfg.fbId) metaPageView(pathname);
  }, [pathname, cfg, consent.analytics, consent.marketing]);

  if (!cfg) return null;
  const { gaId, fbId, clarityId, gtmId, paid } = cfg;

  return (
    <>
      <GoogleTagManager containerId={gtmId} />
      {/* The pixel queue (fbq) is ready at once; the ~100 KB pixel library
          itself loads after the page has loaded and the browser is idle, then
          sends everything queued. It starts with the match keys we have: the
          anonymous visitor id (_mvid) and, for a returning buyer, their hashed
          email / phone. Visitors arriving from a Meta ad (fbclid in
          the address) get it at once instead: many of them leave within
          seconds, and Meta counts a landing page view only when the pixel
          fires. The Conversions API copy is unaffected. */}
      {fbId && consent.marketing && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];var L=function(){t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)};
              var G=function(){setTimeout(function(){f.requestIdleCallback?f.requestIdleCallback(L,{timeout:4000}):L()},1500)};
              /[?&]fbclid=/.test(f.location.search)?L():b.readyState==='complete'?G():f.addEventListener('load',G,{once:true})}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              var am={};try{var c=document.cookie.match(/(?:^|; )_mvid=([a-f0-9]{64})/);if(c)am.external_id=c[1];var r=JSON.parse(window.localStorage.getItem('fb_am')||'null');if(r&&/^[a-f0-9]{64}$/.test(r.em||''))am.em=r.em;if(r&&/^[a-f0-9]{64}$/.test(r.ph||''))am.ph=r.ph;}catch(x){}
              window._fbqId='${fbId}';fbq('init', '${fbId}', am);
              window.dispatchEvent(new Event('brand-fbq-ready'));
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
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy={paid ? 'afterInteractive' : 'lazyOnload'} />
          <Script id="ga4-init" strategy={paid ? 'afterInteractive' : 'lazyOnload'}
            dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false });
              window.__brandGa4Ready = true;
              window.dispatchEvent(new Event('brand-ga4-ready'));
            ` }}
          />
        </>
      )}

      {clarityId && consent.analytics && (
        <Script id="ms-clarity" strategy="lazyOnload"
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
