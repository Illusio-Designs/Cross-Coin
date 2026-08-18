import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
        <link rel="shortcut icon" href="/Gripzusfavicon.jpeg" />
        <link rel="apple-touch-icon" href="/Gripzusfavicon.jpeg" />

        {/* MSG91 OTP widget — exposes window.sendOtp / window.verifyOtp */}
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
                var urls = ['https://verify.msg91.com/otp-provider.js', 'https://verify.phone91.com/otp-provider.js'];
                function tryLoad(i) {
                  if (i >= urls.length) return;
                  var s = document.createElement('script');
                  s.type = 'text/javascript';
                  s.src = urls[i];
                  s.onload = function() {
                    if (typeof initSendOTP === 'function') initSendOTP(configuration);
                  };
                  s.onerror = function() { tryLoad(i + 1); };
                  document.head.appendChild(s);
                }
                tryLoad(0);
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