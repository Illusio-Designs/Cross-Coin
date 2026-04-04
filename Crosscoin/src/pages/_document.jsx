import { Html, Head, Main, NextScript } from "next/document";
import { Partytown } from "@qwik.dev/partytown/react";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect */}
        <link rel="preconnect" href="https://api.crosscoin.in" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />

        {/* DNS prefetch */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://verify.msg91.com" />

        {/* DM Sans font — non-render-blocking */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap" />
        </noscript>

        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#180D3E" />
        <link rel="icon" href="/crosscoin icon.png" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />

        {/*
          Window stubs — MUST be defined before Partytown initialises.
          When fbq() / gtag() are called from React components, these stubs
          queue the calls. Partytown then forwards them into the Web Worker
          once the real scripts have loaded there.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // FB Pixel stub — queues calls until fbevents.js loads in worker
              window.fbq = window.fbq || function() {
                (window.fbq.q = window.fbq.q || []).push(arguments);
              };
              window._fbq = window._fbq || window.fbq;

              // GA4 stub — queues calls until gtag.js loads in worker
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function() {
                window.dataLayer.push(arguments);
              };
            `,
          }}
        />

        {/*
          Partytown config — forward proxies these globals from the worker
          back to the main thread so window.fbq() / window.gtag() work
          from anywhere in your React app.
        */}
        <Partytown
          lib="/~partytown/"
          forward={["fbq", "gtag", "dataLayer.push"]}
        />

        {/*
          MSG91 OTP Widget — main thread only.
          Calls initSendOTP() and injects DOM elements — cannot run in a worker.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var configuration = {
                  widgetId: "366342706343383735393039",
                  tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
                  exposeMethods: true,
                  success: function(data) { window.__msg91OtpSuccess = data; },
                  failure: function(error) { window.__msg91OtpFailure = error; }
                };
                var s = document.createElement('script');
                s.type = 'text/javascript';
                s.src = 'https://verify.msg91.com/otp-provider.js';
                s.onload = function() { initSendOTP(configuration); };
                document.head.appendChild(s);
              })();
            `,
          }}
        />
      </Head>
      <body>
        <noscript>
          <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <h1>Cross Coin</h1>
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
