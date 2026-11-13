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
 * IDs come from /api/public/tracking-config, scoped to this brand via the
 * X-Brand-Name header — read by the layout on the server (cached 5 minutes,
 * passed in as `initial`), else fetched here — so changing GA_MEASUREMENT_ID /
 * FB_PIXEL_ID / CLARITY_ID in the dashboard takes effect within minutes, no
 * redeploy or build-time env var required.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique';

export default function Analytics({ initial = null }) {
  const [cfg, setCfg] = useState(null);
  const pathname = usePathname();
  const consent = useConsent();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return;
    let aborted = false;
    // The layout already fetched the IDs on the server (cached 5 minutes), so
    // tracking starts at once instead of after a round trip to the API — many
    // ad visitors leave within seconds. Fetched here only when it couldn't.
    const config = initial?.success
      ? Promise.resolve(initial)
      : fetch(`${API_URL}/api/public/tracking-config`, { cache: 'no-store', headers: { 'X-Brand-Name': BRAND } }).then((r) => r.json());
    config
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
  }, [initial, consent.analytics, consent.marketing]);

  // Fire a page_view / PageView on client-side route changes.
  useEffect(() => {
    if (!cfg || typeof window === 'undefined') return;
    if (cfg.gaId) trackPageView(pathname);
    // Meta PageView for every page, first load included (browser + CAPI copy,
    // one event id); the pixel snippet itself no longer sends one.
    if (consent.marketing && cfg.fbId) metaPageView(pathname);
  }, [pathname, cfg, consent.analytics, consent.marketing]);

  // Visitors who did NOT come from an ad get Google's tags (GA4, Tag
  // Manager) and Clarity once they first touch, click, type or use the mouse
  // wheel — or after 20 seconds — instead of during page load: those scripts (~300 KB) are what
  // kept the phone busy while the product photo and Buy button were loading.
  // Nothing is lost: page views and events wait in a queue until they load.
  // Visitors from an ad (paid) still get everything at once.
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!cfg || cfg.paid || late) return undefined;
    // Real input only: a page fires scroll events by itself while it loads
    // (smooth scrolling, scroll restoration), which started everything early.
    const evs = ['pointerdown', 'touchstart', 'keydown', 'wheel'];
    let timer = null;
    const go = () => { evs.forEach((e) => window.removeEventListener(e, go)); clearTimeout(timer); setLate(true); };
    evs.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    timer = setTimeout(go, 20000);
    return () => { evs.forEach((e) => window.removeEventListener(e, go)); clearTimeout(timer); };
  }, [cfg, late]);

  if (!cfg) return null;
  const { gaId, fbId, clarityId, gtmId, paid } = cfg;
  const now = paid || late;

  return (
    <>
      <GoogleTagManager containerId={now ? gtmId : null} />
      {/* The pixel queue (fbq) is ready at once; the ~100 KB pixel library
          itself loads after the page has loaded, on the shopper's first
          touch / scroll (or after 20 s), then sends everything queued. It starts with the match keys we have: the
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
              n.queue=[];var L=function(){if(b.querySelector('script[src="'+v+'"]'))return;t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)};
              var G=function(){var d=0,x=['pointerdown','touchstart','keydown','wheel'],g=function(){if(d)return;d=1;x.forEach(function(k){f.removeEventListener(k,g)});f.requestIdleCallback?f.requestIdleCallback(L,{timeout:2000}):L()};x.forEach(function(k){f.addEventListener(k,g,{once:true,passive:true})});setTimeout(g,20000)};
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

      {gaId && now && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive"
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

      {clarityId && consent.analytics && now && (
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
