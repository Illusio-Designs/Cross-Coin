// Load only this storefront's configured container. Google tags receive consent
// before the container loads and whenever the visitor changes their choice.
export function syncGoogleTagManager(containerId, consent) {
  if (typeof window === 'undefined') return;
  const validId = /^GTM-[A-Z0-9]+$/.test(containerId || '');

  window.dataLayer = window.dataLayer || [];
  const command = function () { window.dataLayer.push(arguments); };
  const denied = {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  };
  if (!window.__brandGtm) {
    window.__brandGtm = { containers: {} };
    command('consent', 'default', denied);
  }
  command('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });

  // Advanced Consent Mode loads Google tags even with storage denied.
  // Custom tags in GTM must still have their own consent checks configured.
  if (!validId || window.__brandGtm.containers[containerId]) return;
  window.__brandGtm.containers[containerId] = true;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  // The container (and every tag in it) loads once the page has finished
  // loading and the browser is idle, so it never competes with the first
  // paint. Nothing is lost: everything pushed to dataLayer before then is
  // processed when the container starts.
  const inject = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    script.onerror = () => {
      delete window.__brandGtm.containers[containerId];
      script.remove();
    };
    document.head.appendChild(script);
  };
  afterPageLoad(inject);
}

// Run `fn` after the window load event, a short pause and an idle moment.
export function afterPageLoad(fn, delayMs = 1500) {
  if (typeof window === 'undefined') return;
  const idle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 4000 });
    else fn();
  };
  const go = () => setTimeout(idle, delayMs);
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}
