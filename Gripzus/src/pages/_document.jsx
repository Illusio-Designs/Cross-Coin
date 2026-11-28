import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Pictures wait (hidden) until fully loaded; with JavaScript off, show them straight away. */}
        <noscript><style>{'img.gzimg{opacity:1!important}:has(> img.gzimg){animation:none!important;background-image:none!important}'}</style></noscript>
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
        {/* No half-drawn images: <img class="gzimg"> stays hidden until fully
            loaded + decoded. This reveals server-rendered images that finish
            before React hydrates (the hero / product main image); after that
            components/common/GzImage.jsx takes over. */}
        <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('load',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.classList||!t.classList.contains('gzimg'))return;var d=function(){t.classList.add('is-on')};if(t.decode){t.decode().then(d,d)}else{d()}},true);" }} />
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <link rel="preconnect" href="https://ik.imagekit.io" />
        <link rel="icon" href="/gripzus-mark.webp" />
        <link rel="shortcut icon" href="/gripzus-mark.webp" />
        <link rel="apple-touch-icon" href="/gripzus-mark.webp" />

        {/* Login and registration warm the OTP widget when opened. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var configuration = {
                  widgetId: "366342706343383735393039",
                  tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
                  exposeMethods: true,
                  identifier: "",
                  success: function(data) { window.__msg91OtpSuccess = data; },
                  failure: function(error) { window.__msg91OtpFailure = error; }
                };
                var urls = ['https://verify.msg91.com/otp-provider.js', 'https://verify.phone91.com/otp-provider.js'];
                function tryLoad(i) {
                  if (i >= urls.length) { window.__msg91Started = false; return; }
                  var s = document.createElement('script');
                  s.type = 'text/javascript';
                  s.async = true;
                  s.src = urls[i];
                  s.onload = function() {
                    if (typeof initSendOTP === 'function') initSendOTP(configuration);
                  };
                  s.onerror = function() { tryLoad(i + 1); };
                  document.head.appendChild(s);
                }
                function loadMsg91() {
                  if (window.__msg91Started) return;
                  window.__msg91Started = true;
                  tryLoad(0);
                }
                window.__loadGripzusOtp = loadMsg91;
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}