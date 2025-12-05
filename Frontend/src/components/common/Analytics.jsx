"use client";

import Script from "next/script";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1313610943804396"; // Facebook Pixel ID

const FacebookPixel = () => {
  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
          
          // Block unwanted events after fbq is loaded
          (function() {
            setTimeout(function() {
              if (window.fbq && typeof window.fbq === 'function') {
                var originalFbq = window.fbq;
                var blockedEvents = ['SubscribedButtonClick'];
                
                window.fbq = function() {
                  var args = Array.prototype.slice.call(arguments);
                  // Check if this is a 'track' call with a blocked event
                  if (args.length >= 2 && args[0] === 'track') {
                    var eventName = args[1];
                    if (blockedEvents.indexOf(eventName) !== -1) {
                      console.warn('Blocked unwanted Facebook Pixel event: ' + eventName);
                      return;
                    }
                  }
                  // Call original fbq for all other events
                  return originalFbq.apply(this, arguments);
                };
                
                // Copy all properties and methods from original fbq
                Object.keys(originalFbq).forEach(function(key) {
                  window.fbq[key] = originalFbq[key];
                });
                
                // Preserve the queue if it exists
                if (originalFbq.queue) {
                  window.fbq.queue = originalFbq.queue;
                }
              }
            }, 100);
          })();
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
};

// Helper to track custom Facebook Pixel events
export function fbqTrack(event, params = {}) {
  if (typeof window !== "undefined" && window.fbq) {
    try {
      // Block unwanted events from browser extensions or third-party scripts
      const blockedEvents = ['SubscribedButtonClick'];
      if (blockedEvents.includes(event)) {
        console.warn(`Blocked unwanted Facebook Pixel event: ${event}`);
        return;
      }
      
      window.fbq("track", event, params);
      console.log(`Facebook Pixel event tracked: ${event}`, params);
    } catch (error) {
      console.error(`Error tracking Facebook Pixel event ${event}:`, error);
    }
  } else {
    console.warn('Facebook Pixel (fbq) not available yet');
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"; // Google Analytics Measurement ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "lzy55n7g8h"; // Microsoft Clarity Project ID

const Clarity = () => {
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${CLARITY_ID}");
            `}
    </Script>
  );
};

const Analytics = () => {
  return (
    <>
      <FacebookPixel />
      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}'); // <-- Set in .env
        `}
      </Script>
      <Clarity />
    </>
  );
};

export default Analytics;
