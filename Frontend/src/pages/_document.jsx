import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Prevent zoom on form inputs on iOS */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#180D3E" />

        {/* Preload critical fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon */}
        <link rel="icon" href="/crosscoin icon.png" />

        {/* Prevent dark mode */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
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
