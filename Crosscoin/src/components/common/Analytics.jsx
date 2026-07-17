import { useRouter } from "next/router";
import { useEffect } from "react";

// The tracking scripts (gtag / fbq / Clarity) are now rendered server-side in
// _document.jsx, reading the IDs from Brand Settings via
// /api/public/tracking-config. That makes the tags detectable by Google's
// tester / Tag Assistant and removes the dependency on a slow client fetch.
//
// This component's only job now is to fire page-view events on client-side
// (SPA) route changes — the initial page view is sent by the server-injected
// gtag('config') / fbq('track','PageView'). window.gtag / window.fbq are
// provided by those server-rendered scripts.

const EXCLUDED_PATHS = ['/dashboard', '/auth'];
const isExcluded = (url) => EXCLUDED_PATHS.some(p => url.startsWith(p));

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
  return null;
};

export default Analytics;
