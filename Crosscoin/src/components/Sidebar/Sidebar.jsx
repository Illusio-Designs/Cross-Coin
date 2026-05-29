import React from 'react';
import { useAuth } from '../../context/AuthContext';

const IC = {
  dashboard: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  slider:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  products:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  orders:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  payments:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  coupons:   <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  shipping:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  reviews:   <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  seo:       <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  policies:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  brands:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  settings:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  analytics: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  consumers: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  staffUsers:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/><path d="M16 11l2 2 4-4"/></svg>,
  logout:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevDown:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  chevLeft:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  chevRight: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  close:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  wa:        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  blog:      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  social:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  monitoring:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M3 20a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14z"/></svg>,
};

// roles: array of roles that can see this item. null/undefined = all staff
const ALL_MENU = [
  { label: 'Dashboard',    icon: IC.dashboard, view: 'main' },
  { label: 'Orders',       icon: IC.orders,    view: 'orders',    roles: ['admin','order_manager'] },
  { label: 'Analytics',    icon: IC.analytics, view: 'analytics', roles: ['admin'] },
  { label: 'Monitoring',   icon: IC.monitoring, view: 'monitoring', roles: ['admin'] },
  {
    label: 'Products', icon: IC.products, roles: ['admin','product_manager'],
    submenu: [
      { label: 'Products',      view: 'products' },
      { label: 'Categories',    view: 'categories' },
      { label: 'Attributes',    view: 'attributes' },
      { label: 'Media Gallery', view: 'media-gallery' },
    ],
  },
  {
    label: 'Marketing', icon: IC.coupons, roles: ['admin','order_manager'],
    submenu: [
      { label: 'Coupons',       view: 'coupons' },
      { label: 'Reviews',       view: 'reviews' },
      { label: 'UTM Analytics', view: 'utm-analytics', roles: ['admin'] },
    ],
  },
  {
    label: 'Social Commerce', icon: IC.social, roles: ['admin','product_manager'],
    submenu: [
      { label: 'Lookbooks',      view: 'lookbooks' },
      { label: 'Reels',          view: 'reels-admin' },
      { label: 'Instagram Feed', view: 'instagram-admin' },
    ],
  },
  {
    label: 'Content', icon: IC.blog, roles: ['admin','product_manager'],
    submenu: [
      { label: 'Slider',    view: 'slider' },
      { label: 'Blogs',     view: 'blogs' },
      // Single SEO entry — opens the unified hub (Overview / Pages /
      // Products / FAQs / Settings / Search Console tabs in one view).
      { label: 'SEO',           view: 'seo' },
      { label: 'Policies',  view: 'policies', roles: ['admin'] },
    ],
  },
  {
    label: 'Settings', icon: IC.settings, roles: ['admin'],
    submenu: [
      { label: 'Brands',         view: 'brands' },
      { label: 'Brand Settings', view: 'brand-settings' },
      { label: 'Shipping',       view: 'shipping-settings' },
      { label: 'Shipping Fees',  view: 'shippingFees' },
    ],
  },
  { label: 'Payments',     icon: IC.payments,   view: 'payments',    roles: ['admin','order_manager'] },
  { label: 'Consumers',    icon: IC.consumers,  view: 'consumers',   roles: ['admin','order_manager'] },
  { label: 'WhatsApp',     icon: IC.wa,         view: 'whatsapp',    roles: ['admin','whatsapp_manager'] },
  { label: 'Staff Users',  icon: IC.staffUsers, view: 'staff-users', roles: ['admin'] },
  { label: 'Logout',       icon: IC.logout,     view: 'logout' },
];

function filterMenu(menu, role) {
  return menu
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => {
      if (!item.submenu) return item;
      const filteredSub = item.submenu.filter(s => !s.roles || s.roles.includes(role));
      return filteredSub.length ? { ...item, submenu: filteredSub } : null;
    })
    .filter(Boolean);
}

export default function Sidebar({ isCollapsed, onToggleCollapse, onViewChange, currentView, isMobileMenuOpen, onMobileMenuToggle }) {
  const { user, role } = useAuth();
  const [openMenu, setOpenMenu] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const hideTimeoutRef = React.useRef(null);

  const MENU = React.useMemo(() => filterMenu(ALL_MENU, role), [role]);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMouseEnter = (e, idx) => {
    if (isMobile || !isCollapsed) return;
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ idx, top: rect.top + rect.height / 2 });
  };

  const handleMouseLeave = () => {
    if (isMobile || !isCollapsed) return;
    hideTimeoutRef.current = setTimeout(() => setTooltip(null), 120);
  };

  const handleTooltipEnter = () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
  const handleTooltipLeave = () => { hideTimeoutRef.current = setTimeout(() => setTooltip(null), 80); };

  const isActive = (item) => {
    if (item.view && currentView === item.view) return true;
    if (item.submenu) return item.submenu.some(s => s.view === currentView);
    return false;
  };

  const handleItemClick = (item, idx) => {
    if (item.submenu) {
      if (!isCollapsed || isMobile) setOpenMenu(openMenu === idx ? null : idx);
    } else {
      onViewChange(item.view);
      if (isMobile && onMobileMenuToggle) onMobileMenuToggle();
    }
  };

  const handleSubClick = (view) => {
    onViewChange(view);
    if (isMobile && onMobileMenuToggle) onMobileMenuToggle();
  };

  const expanded = !isCollapsed || (isMobile && isMobileMenuOpen);

  // Role badge color
  const roleBadgeColor = {
    admin:            '#ef4444',
    product_manager:  '#8b5cf6',
    order_manager:    '#f59e0b',
    whatsapp_manager: '#10b981',
  }[role] || '#6b7280';

  const roleLabel = {
    admin:            'Admin',
    product_manager:  'Product Manager',
    order_manager:    'Order Manager',
    whatsapp_manager: 'WhatsApp Manager',
  }[role] || role;

  return (
    <>
      {isMobile && isMobileMenuOpen && (
        <div className="sb-overlay" onClick={onMobileMenuToggle} />
      )}

      <aside className={`sb${isCollapsed ? ' sb--collapsed' : ''}${isMobile && isMobileMenuOpen ? ' sb--open' : ''}`}>

        {/* Header */}
        <div className="sb-header">
          <div className="sb-logo">
            <img src="/crosscoin-icon.png" alt="CrossCoin" />
            {expanded && (
              <div className="sb-logo-text">
                <span className="sb-logo-name">CrossCoin</span>
                <span className="sb-logo-sub">ADMIN PANEL</span>
              </div>
            )}
          </div>
          {isMobile && isMobileMenuOpen ? (
            <button className="sb-toggle sb-toggle--close" onClick={onMobileMenuToggle} aria-label="Close">{IC.close}</button>
          ) : !isMobile ? (
            <button className="sb-toggle" onClick={onToggleCollapse} aria-label="Toggle sidebar">
              {isCollapsed ? IC.chevRight : IC.chevLeft}
            </button>
          ) : null}
        </div>

        {/* Role badge — now shown in dashboard header */}

        <nav className="sb-nav">
          {MENU.map((item, idx) => {
            const active = isActive(item);
            const isOpen = openMenu === idx;
            const showTooltip = !isMobile && isCollapsed && tooltip?.idx === idx;

            return (
              <div
                key={item.label}
                className="sb-item"
                onMouseEnter={(e) => handleMouseEnter(e, idx)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`sb-link${active ? ' sb-link--active' : ''}`}
                  onClick={() => handleItemClick(item, idx)}
                >
                  <span className="sb-icon">{item.icon}</span>
                  {expanded && <span className="sb-label">{item.label}</span>}
                  {expanded && item.submenu && (
                    <span className={`sb-chev${isOpen ? ' sb-chev--open' : ''}`}>{IC.chevDown}</span>
                  )}
                </button>

                {item.submenu && isOpen && expanded && (
                  <div className="sb-sub">
                    {item.submenu.map(s => (
                      <button
                        key={s.label}
                        className={`sb-sub-link${currentView === s.view ? ' sb-sub-link--active' : ''}`}
                        onClick={() => handleSubClick(s.view)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {showTooltip && !item.submenu && (
                  <div className="sb-tooltip" style={{ top: tooltip.top }}>{item.label}</div>
                )}
                {showTooltip && item.submenu && (
                  <div className="sb-tooltip-menu" style={{ top: tooltip.top }}
                    onMouseEnter={handleTooltipEnter}
                    onMouseLeave={handleTooltipLeave}>
                    <div className="sb-tooltip-title">{item.label}</div>
                    {item.submenu.map(s => (
                      <button
                        key={s.label}
                        className={`sb-tooltip-link${currentView === s.view ? ' sb-tooltip-link--active' : ''}`}
                        onClick={() => handleSubClick(s.view)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sb-footer">
          <button
            className="sb-help"
            onClick={() => window.open('https://wa.me/917600046416?text=' + encodeURIComponent('Hi, I need help with CrossCoin Admin Panel.'), '_blank')}
          >
            {IC.wa}
            {expanded && <span>Need help?</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
