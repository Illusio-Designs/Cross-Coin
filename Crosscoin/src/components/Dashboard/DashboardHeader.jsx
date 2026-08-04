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
};

function DashboardHeader({ isFullscreen, onToggleFullscreen, currentView, isMobile, onMobileMenuToggle }) {
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
          <span className="dh-role-badge" style={{ color, borderColor: color, background: color + '12' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
            {label}
          </span>
        )}
        <NotificationBell />
        <button className="dh-action" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
          {isFullscreen ? IC.minimize : IC.maximize}
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
