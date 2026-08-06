import { getPageTitle } from "../../utils/dashboardRouting";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Maximize01Icon, Minimize01Icon, Sun03Icon, Moon02Icon } from '@hugeicons/core-free-icons';

const ROLE_COLORS = {
  admin:            '#0a0a0a',
  product_manager:  '#3f3f46',
  order_manager:    '#6b6b73',
  whatsapp_manager: '#9a9aa2',
};

const ROLE_LABELS = {
  admin:            'Admin',
  product_manager:  'Product Manager',
  order_manager:    'Order Manager',
  whatsapp_manager: 'WhatsApp Manager',
};

const IC = {
  menu:     <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={2} />,
  maximize: <HugeiconsIcon icon={Maximize01Icon} size={17} strokeWidth={2} />,
  minimize: <HugeiconsIcon icon={Minimize01Icon} size={17} strokeWidth={2} />,
  sun:      <HugeiconsIcon icon={Sun03Icon} size={17} strokeWidth={2} />,
  moon:     <HugeiconsIcon icon={Moon02Icon} size={17} strokeWidth={2} />,
};

function DashboardHeader({ isFullscreen, onToggleFullscreen, currentView, isMobile, onMobileMenuToggle, theme, themeMode, onToggleTheme }) {
  const { role } = useAuth();
  const color = ROLE_COLORS[role] || '#6b6b73';
  const label = ROLE_LABELS[role] || role;

  return (
    <header className="dh">
      <div className="dh-left">
        {isMobile && (
          <button className="dh-hamburger" onClick={onMobileMenuToggle} aria-label="Open menu">
            {IC.menu}
          </button>
        )}
        <span className="dh-title">{getPageTitle(currentView)}</span>
      </div>
      <div className="dh-right">
        {role && (
          <span className="dh-role-badge" style={{ color: 'var(--ds-color-text)', borderColor: 'var(--ds-color-border)', background: 'var(--ds-color-surface-soft)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ds-color-text-faint)', flexShrink: 0, display: 'inline-block' }} />
            {label}
          </span>
        )}
        <NotificationBell />
        {onToggleTheme && (
          <button className="dh-action" onClick={onToggleTheme}
            title={themeMode === 'auto' ? `Theme: Auto — follows IST time (now ${theme}). Click for Light.` : themeMode === 'light' ? 'Theme: Light. Click for Dark.' : 'Theme: Dark. Click for Auto.'}
            aria-label="Toggle theme">
            {theme === 'dark' ? IC.sun : IC.moon}
          </button>
        )}
        <button className="dh-action" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
          {isFullscreen ? IC.minimize : IC.maximize}
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
