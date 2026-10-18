import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { syncGoogleTagManager } from '../../shared/frontend/googleTagManager.mjs';

function browser() {
  const scripts = [];
  globalThis.window = {};
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    head: { appendChild: script => scripts.push(script) },
  };
  return scripts;
}
afterEach(() => { delete globalThis.window; delete globalThis.document; });

test('missing or invalid container never loads a default container', () => {
  const scripts = browser();
  for (const id of [undefined, '', 'G-1234', 'GTM-ABC<script>']) {
    syncGoogleTagManager(id, { analytics: true, marketing: true });
  }
  assert.equal(scripts.length, 0);
});

test('denied consent precedes loading and acceptance does not duplicate the container', () => {
  const scripts = browser();
  syncGoogleTagManager('GTM-MORBIX', { analytics: false, marketing: false });
  assert.equal(scripts.length, 1);
  assert.deepEqual(Object.values(window.dataLayer[1][2]), ['denied', 'denied', 'denied', 'denied']);
  assert.equal(window.dataLayer[0][0], 'consent');
  assert.equal(window.dataLayer[0][1], 'default');
  syncGoogleTagManager('GTM-MORBIX', { analytics: true, marketing: false });
  syncGoogleTagManager('GTM-MORBIX', { analytics: true, marketing: false });
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-MORBIX');
  assert.equal(window.dataLayer.filter(row => row.event === 'gtm.js').length, 1);
  assert.equal(window.dataLayer[3][2].analytics_storage, 'granted');
  assert.equal(window.dataLayer[3][2].ad_storage, 'denied');
});

test('revoking consent updates the loaded Google tags', () => {
  browser();
  syncGoogleTagManager('GTM-MORBIX', { analytics: true, marketing: true });
  syncGoogleTagManager('GTM-MORBIX', { analytics: false, marketing: false });
  const update = window.dataLayer.at(-1);
  assert.equal(update[1], 'update');
  assert.deepEqual(Object.values(update[2]), ['denied', 'denied', 'denied', 'denied']);
});

test('a failed load permits a later retry', () => {
  const scripts = browser();
  syncGoogleTagManager('GTM-MORBIX', { analytics: true });
  scripts[0].onerror();
  syncGoogleTagManager('GTM-MORBIX', { analytics: true });
  assert.equal(scripts.length, 2);
});

test('server rendering performs no browser operations', () => {
  assert.doesNotThrow(() => syncGoogleTagManager('GTM-MORBIX', { analytics: true }));
});

// Direct GA4 must receive consent commands even when no GTM container is set.
test('GA4-only brands initialize denied storage without loading a GTM container', () => {
  const scripts = browser();
  syncGoogleTagManager(null, { analytics: false, marketing: false });
  assert.equal(scripts.length, 0);
  assert.equal(window.dataLayer[0][1], 'default');
  assert.equal(window.dataLayer[1][2].analytics_storage, 'denied');
});
