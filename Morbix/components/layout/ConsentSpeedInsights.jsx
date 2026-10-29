'use client';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useConsent } from '@/lib/consent';

/* Vercel Speed Insights — on for every visitor (lib/consent: all tracking granted). */
export default function ConsentSpeedInsights() {
  const { analytics } = useConsent();
  return analytics ? <SpeedInsights /> : null;
}
