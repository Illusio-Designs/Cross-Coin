import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DashboardSquare01Icon, SlidersHorizontalIcon, Package01Icon, ShoppingBag02Icon,
  CreditCardIcon, Discount01Icon, DeliveryTruck01Icon, StarIcon, Search01Icon,
  File01Icon, Building01Icon, Settings01Icon, Analytics01Icon, UserMultiple02Icon,
  UserCheck01Icon, Logout01Icon, ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon,
  Cancel01Icon, WhatsappIcon, News01Icon, Share08Icon, ChartLineData01Icon,
} from '@hugeicons/core-free-icons';

const nav = (icon) => <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />;
const IC = {
  dashboard: nav(DashboardSquare01Icon),
  slider:    nav(SlidersHorizontalIcon),
  products:  nav(Package01Icon),
  orders:    nav(ShoppingBag02Icon),
  payments:  nav(CreditCardIcon),
  coupons:   nav(Discount01Icon),
  shipping:  nav(DeliveryTruck01Icon),
  reviews:   nav(StarIcon),
  seo:       nav(Search01Icon),
  policies:  nav(File01Icon),
  brands:    nav(Building01Icon),
  settings:  nav(Settings01Icon),
  analytics: nav(Analytics01Icon),
  consumers: nav(UserMultiple02Icon),
  staffUsers: nav(UserCheck01Icon),
  logout:    nav(Logout01Icon),
  chevDown:  <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2} />,
  chevLeft:  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />,
  chevRight: <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />,
  close:     <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />,
  wa:        nav(WhatsappIcon),
  blog:      nav(News01Icon),
  social:    nav(Share08Icon),
  reports:   nav(ChartLineData01Icon),
};

// roles: array of roles that can see this item. null/undefined = all staff
const ALL_MENU = [
  { label: 'Dashboard',    icon: IC.dashboard, view: 'main' },
  { label: 'Orders',       icon: IC.orders,    view: 'orders',    roles: ['admin','order_manager'] },
  { label: 'Reports',      icon: IC.reports,   view: 'reports',   roles: ['admin','order_manager'] },
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
    ],
  },
  {
    label: 'Content', icon: IC.blog, roles: ['admin','product_manager'],
    submenu: [
      { label: 'Slider',    view: 'slider' },
      { label: 'Blogs',     view: 'blogs' },
      // Single SEO entry — opens the unified hub (Overview / Pages /
      // Products / FAQs / Settings tabs in one view).
      { label: 'SEO',           view: 'seo' },
      { label: 'Policies',  view: 'policies', roles: ['admin'] },
    ],
  },
  {
    label: 'Settings', icon: IC.settings, roles: ['admin'],
    submenu: [
      { label: 'Brands & Settings', view: 'brands' },
      { label: 'Shipping Fees',  view: 'shippingFees' },
    ],
  },
  { label: 'Consumers',    icon: IC.consumers,  view: 'consumers',   roles: ['admin','order_manager'] },
  { label: 'WhatsApp',     icon: IC.wa,         view: 'whatsapp',    roles: ['admin','whatsapp_manager'] },
  { label: 'Staff Users',  icon: IC.staffUsers, view: 'staff-users', roles: ['admin'] },
  // Logout moved to the header profile menu (see DashboardHeader → ProfileMenu).
];

// userRoles is the user's effective role set — an item shows if the user holds
// ANY role the item allows (null = visible to all staff).
function filterMenu(menu, userRoles) {
  const canSee = (allowed) => !allowed || allowed.some(r => userRoles.includes(r));
  return menu
    .filter(item => canSee(item.roles))
    .map(item => {
      if (!item.submenu) return item;
      const filteredSub = item.submenu.filter(s => canSee(s.roles));
      return filteredSub.length ? { ...item, submenu: filteredSub } : null;
    })
    .filter(Boolean);
}

export default function Sidebar({ isCollapsed, onToggleCollapse, onViewChange, currentView, isMobileMenuOpen, onMobileMenuToggle }) {
  const { user, roles } = useAuth();
  const [openMenu, setOpenMenu] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const hideTimeoutRef = React.useRef(null);

  const roleKey = (roles || []).join(',');
  const MENU = React.useMemo(() => filterMenu(ALL_MENU, roles || []), [roleKey]);

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

  // Badge reflects the widest role the user holds (admin ⇒ admin, else first).
  const primaryRole = (roles || []).includes('admin') ? 'admin' : (roles || [])[0];

  // Role badge color
  const roleBadgeColor = {
    admin:            '#ef4444',
    product_manager:  '#8b5cf6',
    order_manager:    '#f59e0b',
    whatsapp_manager: '#10b981',
  }[primaryRole] || '#6b7280';

  const roleLabel = {
    admin:            'Admin',
    product_manager:  'Product Manager',
    order_manager:    'Order Manager',
    whatsapp_manager: 'WhatsApp Manager',
  }[primaryRole] || primaryRole;

  return (
    <>
      {isMobile && isMobileMenuOpen && (
        <div className="sb-overlay" onClick={onMobileMenuToggle} />
      )}

      <aside className={`sb${isCollapsed ? ' sb--collapsed' : ''}${isMobile && isMobileMenuOpen ? ' sb--open' : ''}`}>

        {/* Header */}
        <div className="sb-header">
          <div className="sb-logo">
            <span className="sb-logo-mark" aria-hidden="true">O</span>
            {expanded && (
              <div className="sb-logo-text">
                <span className="sb-logo-name">Obzus</span>
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
