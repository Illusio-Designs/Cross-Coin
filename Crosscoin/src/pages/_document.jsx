import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect — only the 2 most critical image/API origins */}
        <link rel="preconnect" href="https://api.crosscoin.in" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />

        {/* DNS prefetch for fonts and 3rd parties — non-blocking */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://verify.msg91.com" />

        {/* DM Sans font — non-render-blocking */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700;800&display=swap"
        />
        
        {/* Prevent zoom on form inputs on iOS */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#180D3E" />

        {/* Favicon */}
        <link rel="icon" href="/crosscoin icon.png" />

        {/* Prevent dark mode */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />

        {/* MSG91 OTP Widget */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var configuration = {
                  widgetId: "366342706343383735393039",
                  tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
                  exposeMethods: true,
                  identifier: "",
                  captchaType: "invisible",
                  success: function(data) { window.__msg91OtpSuccess = data; },
                  failure: function(error) { window.__msg91OtpFailure = error; }
                };
                var s = document.createElement('script');
                s.type = 'text/javascript';
                s.src = 'https://verify.msg91.com/otp-provider.js';
                s.onload = function() {
                  if (typeof initSendOTP === 'function') initSendOTP(configuration);
                };
                s.onerror = function() { console.error('MSG91 OTP script failed to load'); };
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
