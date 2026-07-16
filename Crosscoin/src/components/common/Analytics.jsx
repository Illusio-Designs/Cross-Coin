import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// The previous env-var fallbacks (NEXT_PUBLIC_GA_ID etc.) baked the value at
// build time. If they weren't set, the placeholder G-XXXXXXXXXX was shipped
// and no hits ever reached the real GA4 property — the admin would configure
// GA_MEASUREMENT_ID in Brand Settings expecting it to "just work" without
// realising a redeploy was required. We now pull the IDs from
// /api/public/tracking-config at runtime so changes in the dashboard take
// effect on the next page load.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

const EXCLUDED_PATHS = ['/dashboard', '/auth'];
const isExcluded = (url) => EXCLUDED_PATHS.some(p => url.startsWith(p));

// Track FB PageView + GA page_view on every client-side route change
function useRouteTracking() {
  const router = useRouter();

  useEffect(() => {
    const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
    const handleRouteChange = (url) => {
      if (isLocalhost || isExcluded(url)) return;

      // Facebook Pixel — PageView on navigation
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "PageView");
      }
      // Google Analytics — page_view on navigation
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "page_view", { page_path: url });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);
}

const Analytics = () => {
  useRouteTracking();
  const router = useRouter();
  const isDashboard = router.pathname.startsWith('/dashboard') || router.pathname.startsWith('/auth');
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    if (isDashboard || isLocalhost) return;
    let aborted = false;
    fetch(`${API_URL}/api/public/tracking-config`, { headers: { 'X-Brand-Name': 'crosscoin' } })
      .then(r => r.json())
      .then(d => {
        if (aborted || !d?.success) return;
        setCfg({
          gaId: d.ga_measurement_id || null,
          fbId: d.fb_pixel_id || null,
          clarityId: d.clarity_id || null,
        });
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [isDashboard, isLocalhost]);

  // Don't load any tracking scripts on dashboard/auth pages or localhost,
  // and don't render anything until we have IDs to inject.
  if (isDashboard || isLocalhost || !cfg) return null;

  const { gaId, fbId, clarityId } = cfg;

  return (
    <>
      {/* ── Facebook Pixel ── */}
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
            `}}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ── Google Analytics 4 ── */}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){
                var _p = window.location.pathname;
                if (_p.startsWith('/dashboard') || _p.startsWith('/auth')) return;
                dataLayer.push(arguments);
              }
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false });
              var _path = window.location.pathname;
              if (!_path.startsWith('/dashboard') && !_path.startsWith('/auth')) {
                gtag('event', 'page_view', { page_path: _path });
              }
            `}}
          />
        </>
      )}

      {/* ── Microsoft Clarity ── */}
      {clarityId && (
        <Script id="microsoft-clarity" strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function(c,l,a,r,i,t,y){
              var _p = window.location.pathname;
              if (_p.startsWith('/dashboard') || _p.startsWith('/auth')) return;
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}}
        />
      )}
    </>
  );
};

export default Analytics;
