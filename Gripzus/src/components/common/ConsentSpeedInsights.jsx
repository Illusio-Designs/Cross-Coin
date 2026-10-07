'use client';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useConsent } from '../../lib/consent';

/* Vercel Speed Insights only loads once the visitor accepts analytics cookies. */
export default function ConsentSpeedInsights() {
  const { analytics } = useConsent();
  return analytics ? <SpeedInsights /> : null;
}
