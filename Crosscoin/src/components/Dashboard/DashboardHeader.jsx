import { getPageTitle } from "../../utils/dashboardRouting";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";

const ROLE_COLORS = {
  admin:            '#ef4444',
  product_manager:  '#8b5cf6',
  order_manager:    '#f59e0b',
  whatsapp_manager: '#10b981',
};

const ROLE_LABELS = {
  admin:            'Admin',
  product_manager:  'Product Manager',
  order_manager:    'Order Manager',
  whatsapp_manager: 'WhatsApp Manager',
};

const IC = {
  menu: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  maximize: (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  ),
  minimize: (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
    </svg>
  ),
  sun: (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>
    </svg>
  ),
  moon: (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  ),
};

function DashboardHeader({ isFullscreen, onToggleFullscreen, currentView, isMobile, onMobileMenuToggle, theme, onToggleTheme }) {
  const { role } = useAuth();
  const color = ROLE_COLORS[role] || '#6b7280';
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
          <button className="dh-action" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
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
