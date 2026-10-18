'use client';

import { useEffect } from 'react';
import { useConsent } from '../lib/consent';
import { syncGoogleTagManager } from '../utils/googleTagManager.mjs';

export default function GoogleTagManager({ containerId }) {
  const { analytics, marketing } = useConsent();
  useEffect(() => {
    syncGoogleTagManager(containerId, { analytics, marketing });
  }, [containerId, analytics, marketing]);
  return null;
}
