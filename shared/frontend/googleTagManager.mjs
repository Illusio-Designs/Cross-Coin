// Load only this storefront's configured container. Google tags receive consent
// before the container loads and whenever the visitor changes their choice.
export function syncGoogleTagManager(containerId, consent) {
  if (typeof window === 'undefined') return;
  const validId = /^GTM-[A-Z0-9]+$/.test(containerId || '');
  if (!validId && !window.__brandGtm) return;

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

  // No container request until analytics consent. Revocation updates loaded
  // Google tags; custom tags in GTM must also have consent checks configured.
  if (!validId || !consent.analytics || window.__brandGtm.containers[containerId]) return;
  window.__brandGtm.containers[containerId] = true;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  script.onerror = () => {
    delete window.__brandGtm.containers[containerId];
    script.remove();
  };
  document.head.appendChild(script);
}
