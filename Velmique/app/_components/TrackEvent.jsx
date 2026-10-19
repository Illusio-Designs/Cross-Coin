'use client';

import { useEffect } from 'react';
import { fbTrack } from '@/utils/pixel';

/* Fires one analytics funnel event (Meta Pixel + CAPI relay, GA4, first-party
   funnel — see utils/pixel.js) once per mount / key. Lets server-rendered
   pages report e.g. ViewContent without becoming client components. */
export default function TrackEvent({ event, params, eventKey }) {
  useEffect(() => {
    if (!event) return;
    fbTrack(event, params || {});
    // Re-fire only when the tracked entity changes (e.g. another product).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, eventKey]);
  return null;
}
