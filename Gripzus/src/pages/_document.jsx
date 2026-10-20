import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
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
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
        <link rel="shortcut icon" href="/Gripzusfavicon.jpeg" />
        <link rel="apple-touch-icon" href="/Gripzusfavicon.jpeg" />

        {/* MSG91 OTP widget — exposes window.sendOtp / window.verifyOtp for
            phone-OTP login. Only login + checkout need it, never at first paint,
            so we defer the third-party script until the browser is idle instead
            of loading it eagerly in <head> on every page. By the time a user
            reaches an OTP step it has long since loaded, but it no longer
            competes with the critical render path. */}
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
                var ric = window.requestIdleCallback || function(cb){ return setTimeout(cb, 2500); };
                ric(loadMsg91);
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