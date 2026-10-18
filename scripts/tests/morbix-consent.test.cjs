const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function consentModule(storageBlocked = false) {
  const rows = new Map();
  const listeners = new Map();
  let state;
  const context = {
    process: { env: {} },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Storage blocked'); return rows.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('Storage blocked'); rows.set(key, value); },
    },
    fetch: async () => ({}),
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    useState: initial => { state = initial(); return [state, value => { state = value; }]; },
    useEffect: callback => callback(),
    window: {
      addEventListener(type, callback) { listeners.set(type, callback); },
      removeEventListener() {},
      dispatchEvent(event) { listeners.get(event.type)?.(event); },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../../Morbix/lib/consent.js'), 'utf8')
    .replace("import { useEffect, useState } from 'react';", '')
    .replace(/export /g, '');
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.api = { getConsent, setConsent, useConsent, CONSENT_KEY };', context);
  return { ...context.api, rows, listeners, state: () => state };
}

test('accept and reject propagate to subscribers when browser storage is blocked', () => {
  const consent = consentModule(true);
  consent.useConsent();
  assert.equal(consent.state().analytics, false);
  consent.setConsent({ analytics: true, marketing: false });
  assert.equal(consent.getConsent().analytics, true);
  assert.equal(consent.state().analytics, true);
  assert.equal(consent.state().set, true);
  consent.setConsent({ analytics: false, marketing: false });
  assert.equal(consent.state().analytics, false);
});

test('cross-tab updates replace the in-memory choice and unrelated storage changes do not', () => {
  const consent = consentModule();
  consent.useConsent();
  consent.setConsent({ analytics: true, marketing: true });
  consent.rows.set(consent.CONSENT_KEY, JSON.stringify({ analytics: false, marketing: false }));
  consent.listeners.get('storage')({ key: 'cart' });
  assert.equal(consent.state().analytics, true);
  consent.listeners.get('storage')({ key: consent.CONSENT_KEY });
  assert.equal(consent.state().analytics, false);
  consent.rows.clear();
  consent.listeners.get('storage')({ key: null });
  assert.equal(consent.state().set, false);
});
