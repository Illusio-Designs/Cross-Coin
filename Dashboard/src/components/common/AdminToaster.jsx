import { useEffect, useState } from 'react';
import { GooeyToaster } from 'goey-toast';

// Where the gooey toasts appear. Follows the dashboard theme: the shell sets
// data-theme="dark" | "light" on <html> (public pages leave it unset → light).
const readTheme = () => (typeof document !== 'undefined'
  && document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

export default function AdminToaster() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    setTheme(readTheme());
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  // Just below the 64px dashboard header, so a toast never covers the bell or
  // the profile menu (phones use Sonner's mobile offset variable).
  return (
    <>
      <style>{'@media (max-width: 600px) { [data-sonner-toaster][data-y-position="top"] { --mobile-offset-top: 72px !important; } }'}</style>
      <GooeyToaster
        position="top-right"
        theme={theme}
        closeButton="top-right"
        maxQueue={4}
        offset={{ top: 76, right: 20 }}
      />
    </>
  );
}
