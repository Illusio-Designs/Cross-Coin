import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1313610943804396";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "seoi51zytn";

const IS_LOCALHOST =
  typeof window !== "undefined" && window.location.hostname === "localhost";

const EXCLUDED_PATHS = ["/dashboard", "/auth"];
const isExcluded = (url) => EXCLUDED_PATHS.some((p) => url.startsWith(p));

// Re-fire tracking on every client-side route change
function useRouteTracking() {
  const router = useRouter();
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (IS_LOCALHOST || isExcluded(url)) return;
      if (window.fbq) window.fbq("track", "PageView");
      if (window.gtag) window.gtag("event", "page_view", { page_path: url });
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);
}

const Analytics = () => {
  useRouteTracking();
  const router = useRouter();

  if (
    router.pathname.startsWith("/dashboard") ||
    router.pathname.startsWith("/auth") ||
    IS_LOCALHOST
  )
    return null;

  return (
    <>
      {/* ── Facebook Pixel — Web Worker via Partytown ──
          No window.location here — workers have no window object.
          The stub in _document.jsx queues fbq() calls until this loads. */}
      <Script
        id="fb-pixel"
        strategy="worker"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${FB_PIXEL_ID}');
            fbq('track','PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>

      {/* ── Google Analytics 4 — Web Worker via Partytown ──
          gtag.js src + init are combined into one worker script to guarantee
          load order. No window.location — not available inside a worker. */}
      <Script
        id="google-analytics"
        strategy="worker"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement('script');
              s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
              s.async = true;
              s.onload = function() {
                window.dataLayer = window.dataLayer || [];
                function gtag(){ dataLayer.push(arguments); }
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              };
              document.head.appendChild(s);
            })();
          `,
        }}
      />

      {/* ── Microsoft Clarity — main thread (afterInteractive) ──
          Session recording uses MutationObserver + real DOM access.
          Partytown's proxied DOM is too slow for heatmaps/session replay. */}
      <Script
        id="microsoft-clarity"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${CLARITY_ID}");
          `,
        }}
      />
    </>
  );
};

export default Analytics;
