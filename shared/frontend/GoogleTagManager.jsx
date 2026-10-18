'use client';

import { useEffect } from 'react';
import { useConsent } from '../lib/consent';
import { syncGoogleTagManager } from '../utils/googleTagManager.mjs';

export default function GoogleTagManager({ containerId }) {
  const consent = useConsent();
  useEffect(() => {
    syncGoogleTagManager(containerId, consent);
  }, [containerId, consent.analytics, consent.marketing]);
  return null;
}
