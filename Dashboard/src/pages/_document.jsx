import { Html, Head, Main, NextScript } from "next/document";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

// The analytics IDs live in Brand Settings and are served by
// /api/public/tracking-config. We fetch them here, on the server, so the
// gtag / fbq / Clarity tags are rendered directly into the page HTML.
//
// Why not just inject them client-side (as <Analytics> used to)? Because a
// JS-injected tag is NOT in the HTML source, so Google's "Test your website",
// Tag Assistant, Search Console and Ads tag verification all report the tag
// as "not detected" — even though real browsers do run it. Rendering it here
// makes the tag detectable AND removes the dependency on a slow client-side
// fetch to the (sometimes slow) cPanel API.
//
// Kept config-driven: change the ID in Brand Settings and the next server
// render picks it up — no code redeploy required.
//
// Defensive by design: a short in-memory cache (so we don't hit the API on
// every render) plus a 2s timeout and graceful fallback (render nothing) so
// a slow or down API can never block or break page rendering.

let _cfgCache = { at: 0, value: null };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getTrackingConfig() {
  const now = Date.now();
  if (_cfgCache.value && now - _cfgCache.at < CACHE_TTL_MS) {
    return _cfgCache.value;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_URL}/api/public/tracking-config`, {
      headers: { "X-Brand-Name": "crosscoin" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const d = await res.json();
    const value = d && d.success
      ? {
          gaId: d.ga_measurement_id || null,
          fbId: d.fb_pixel_id || null,
          clarityId: d.clarity_id || null,
          gtmId: d.gtm_id || null,
          adsId: d.google_ads_id || null,
          adsLabel: d.google_ads_conversion_label || null,
          adsLabels: d.google_ads_labels || null,
        }
      : null;
    _cfgCache = { at: now, value };
    return value;
  } catch {
    // Cache the miss briefly so a down API doesn't get hammered every render.
    _cfgCache = { at: now, value: null };
    return null;
  }
}

export default function Document({ tracking }) {
  const { gaId, fbId, clarityId, gtmId, adsId, adsLabel, adsLabels } = tracking || {};

  return (
    <Html lang="en">
      <Head>
        {/* Deploy resilience (no Vercel Pro / Skew Protection): if a Next.js CSS
            chunk fails to load — deploy skew, or a flaky mobile connection — the
            page renders unstyled ("raw HTML"). Reload ONCE to fetch the current
            assets. Guarded by sessionStorage so it can never loop. Registered
            first so the capture-phase listener is active before the CSS links. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var K='__cssReload';" +
              "window.addEventListener('error',function(e){var t=e&&e.target;" +
              "if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){" +
              "if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);" +
              "}catch(_){}})();",
          }}
        />
        {/* ── Google Tag Manager — loaded as high as possible (server-rendered
            so GTM's own preview / Tag Assistant detect it) ── */}
        {gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
                "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';" +
                "j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;" +
                "f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" + gtmId + "');",
            }}
          />
        )}

        {/* Preconnect — critical image/API + font origins */}
        <link rel="preconnect" href="https://api.crosscoin.in" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for 3rd-party trackers — non-blocking */}
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://verify.msg91.com" />

        {/* ── Google tag: GA4 + Google Ads (server-rendered so it's detectable) ──
            gtag.js is shared by Analytics (G-…) and Ads (AW-…), so we load the
            library once and issue a config() per configured destination. */}
        {(gaId || adsId) && (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId || adsId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "window.dataLayer = window.dataLayer || [];" +
                  "function gtag(){var _p=window.location.pathname;" +
                  "if(_p.indexOf('/dashboard')===0||_p.indexOf('/auth')===0)return;" +
                  "dataLayer.push(arguments);}" +
                  "gtag('js', new Date());" +
                  (gaId ? `gtag('config', '${gaId}');` : "") +
                  (adsId ? `gtag('config', '${adsId}');` : "") +
                  // Expose the Ads id + conversion labels so funnel pages can
                  // fire Google Ads conversions (no-op until a label is set).
                  (adsId ? `window.__gAdsId='${adsId}';` : "") +
                  (adsId && adsLabel ? `window.__gAdsPurchaseLabel='${adsLabel}';` : "") +
                  (adsId && adsLabels ? `window.__gAdsLabels=${JSON.stringify(adsLabels)};` : ""),
              }}
            />
          </>
        )}

        {/* ── Facebook Pixel (server-rendered) ── */}
        {fbId && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?" +
                "n.callMethod.apply(n,arguments):n.queue.push(arguments)};" +
                "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';" +
                "n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;" +
                "s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}" +
                "(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
                `window._fbqId='${fbId}';fbq('init', '${fbId}');fbq('track', 'PageView');`,
            }}
          />
        )}

        {/* ── Microsoft Clarity (server-rendered) ── */}
        {clarityId && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(c,l,a,r,i,t,y){" +
                "var _p=window.location.pathname;" +
                "if(_p.indexOf('/dashboard')===0||_p.indexOf('/auth')===0)return;" +
                "c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};" +
                "t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;" +
                "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);" +
                `})(window,document,'clarity','script','${clarityId}');`,
            }}
          />
        )}

        {/* DM Sans font — loaded asynchronously so it never blocks first paint.
            The stylesheet is preloaded, then attached via a tiny inline script
            (link.rel='stylesheet' added from JS does not block the parser).
            <noscript> keeps it working without JS. font-display:swap means text
            paints immediately in the fallback and swaps in DM Sans when ready.
            Kept as the literal 'DM Sans' family so existing CSS is untouched. */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.createElement('link');l.rel='stylesheet';" +
              "l.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap';" +
              "document.head.appendChild(l);})();",
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap"
          />
        </noscript>

        {/* Prevent zoom on form inputs on iOS */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0a0a0a" />

        {/* Favicon — Obzus "O" monogram */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Prevent dark mode */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />

        {/* MSG91 OTP widget is loaded lazily by <Msg91Loader> (mounted in
            _app) so it stays off the initial critical path — it's only needed
            for the login + checkout OTP flows, never at first paint. */}

      </Head>
      <body>
        {/* Google Tag Manager (noscript) — must be immediately after <body> */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}

        {/* Facebook Pixel <noscript> fallback */}
        {fbId && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <noscript>
          <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <h1>Obzus</h1>
              <p>Please enable JavaScript to view this website.</p>
            </div>
          </div>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx);

  // Only ever load analytics on the real production deployment. Vercel mints a
  // unique *.vercel.app URL for every preview deployment; if the tag fired
  // there it would send hits to the live GA property, so GA fills up with
  // dozens of "unconfigured" *.vercel.app domains and flags the tag as
  // "Needs Attention". VERCEL_ENV is 'production' only on the production
  // deployment ('preview' / 'development' otherwise).
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") {
    return { ...initialProps, tracking: null };
  }
  // Belt-and-suspenders: even the production build is reachable at its own
  // *.vercel.app alias — only report for the real domain, never that alias.
  const host = ((ctx.req && ctx.req.headers && ctx.req.headers.host) || "").split(":")[0];
  if (host.endsWith(".vercel.app")) {
    return { ...initialProps, tracking: null };
  }

  // Never load tracking on the admin dashboard or auth screens.
  const path = ctx.pathname || "";
  if (path.startsWith("/dashboard") || path.startsWith("/auth")) {
    return { ...initialProps, tracking: null };
  }
  const tracking = await getTrackingConfig();
  return { ...initialProps, tracking };
};
