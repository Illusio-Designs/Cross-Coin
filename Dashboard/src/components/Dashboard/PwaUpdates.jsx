import { useEffect, useState } from 'react';
import Button from '../ui/Button';

const CURRENT_RELEASE = process.env.NEXT_PUBLIC_OBZUS_RELEASE;
const UPDATE_ATTEMPT = 'obzus-pwa-update';

export default function PwaUpdates() {
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!standalone) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
    if (!CURRENT_RELEASE) return;

    let interacted = false;
    let busy = false;
    const controller = new AbortController();
    const markInteraction = () => { interacted = true; };

    async function check() {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const { version } = await response.json();
        if (!version || version === CURRENT_RELEASE || controller.signal.aborted || document.visibilityState !== 'visible') return;
        // Keep open dialogs and work already in progress on this screen.
        if (!interacted && !document.querySelector('[aria-modal="true"]') && reloadOnce(version)) return;
        setAvailable(version);
      } catch { /* Retry when the app is active again. */ }
      finally { busy = false; }
    }

    window.addEventListener('pointerdown', markInteraction, true);
    window.addEventListener('keydown', markInteraction, true);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    window.addEventListener('online', check);
    const timer = window.setInterval(check, 5 * 60 * 1000);
    check();
    return () => {
      controller.abort();
      window.removeEventListener('pointerdown', markInteraction, true);
      window.removeEventListener('keydown', markInteraction, true);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', check);
      window.removeEventListener('online', check);
      window.clearInterval(timer);
    };
  }, []);

  return available ? (
    <aside className="dl-pwa-update" aria-label="Dashboard update available">
      <span>Dashboard update available</span>
      <Button size="sm" onClick={() => {
        try { sessionStorage.setItem(UPDATE_ATTEMPT, available); } catch { /* storage unavailable */ }
        window.location.reload();
      }}>Update now</Button>
    </aside>
  ) : null;
}

function reloadOnce(version) {
  try {
    if (sessionStorage.getItem(UPDATE_ATTEMPT) === version) return false;
    sessionStorage.setItem(UPDATE_ATTEMPT, version);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
