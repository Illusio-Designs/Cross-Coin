'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { prefersReducedData } from '@/lib/netinfo';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * Analytics — GA4 + FB Pixel + MS Clarity.
 * Skips load entirely on save-data / 2g connections.
 */
export default function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = pathname + (search?.toString() ? `?${search.toString()}` : '');
    if (GA_ID && window.gtag) window.gtag('event', 'page_view', { page_path: url });
    if (FB_PIXEL_ID && window.fbq) window.fbq('track', 'PageView');
  }, [pathname, search]);

  if (typeof window !== 'undefined' && prefersReducedData()) return null;
  if (!GA_ID && !FB_PIXEL_ID && !CLARITY_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: false });
          `}</Script>
        </>
      )}
      {FB_PIXEL_ID && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `}</Script>
      )}
      {CLARITY_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");
        `}</Script>
      )}
    </>
  );
}
