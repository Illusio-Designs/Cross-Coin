import React from 'react';
import Link from "next/link";
import { useRouter } from "next/router";
import SafeImage from "../common/SafeImage";
import {
  FaHome, FaUser, FaBox, FaClipboardList, FaChartBar, FaLock, FaChevronDown, FaChevronLeft, FaChevronRight, FaQuestionCircle, FaShoppingCart, FaCreditCard, FaStar, FaCog, FaTags, FaTruck, FaFileAlt, FaSignOutAlt, FaImages, FaTimes
} from 'react-icons/fa';
import "./Sidebar.css";

const menu = [
  {
    label: "Dashboard",
    icon: <FaHome />, view: "main"
  },
  {
    label: "Slider",
    icon: <FaImages />, view: "slider"
  },
  {
    label: "Products",
    icon: <FaBox />,
    submenu: [
      { label: "Products", view: "products" },
      { label: "Categories", view: "categories" },
      { label: "Attributes", view: "attributes" },
      { label: "Media Gallery", view: "media-gallery" },
    ]
  },
  {
    label: "Orders",
    icon: <FaClipboardList />,
    view: "orders"
  },
  {
    label: "Payments",
    icon: <FaCreditCard />, view: "payments",
  },
  {
    label: "Coupons",
    icon: <FaTags />, view: "coupons",
  },
  {
    label: "Shipping Fees",
    icon: <FaTruck />,
    view: "shippingFees"
  },
  {
    label: "Reviews",
    icon: <FaStar />, view: "reviews"
  },
  {
    label: "SEO",
    icon: <FaCog />, view: "seo"
  },
  {
    label: "Policies",
    icon: <FaFileAlt />, view: "policies"
  },
  {
    label: "Consumers",
    icon: <FaUser />, view: "consumers"
  },
  {
    label: "Logout",
    icon: <FaSignOutAlt />, view: "logout"
  },
];

const Sidebar = ({ isCollapsed, onToggleCollapse, onViewChange, currentView, isMobileMenuOpen, onMobileMenuToggle }) => {
  const [openMenu, setOpenMenu] = React.useState(null);
  const [hoveredMenu, setHoveredMenu] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleHelpClick = () => {
    const phoneNumber = '917600046416'; // WhatsApp number without + or spaces
    const message = encodeURIComponent('Hi, I need help with CrossCoin Admin Panel. Can you assist me?');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // Helper to check if a menu or submenu is active
  const isMenuActive = (item) => {
    if (item.view && currentView === item.view) return true;
    if (item.submenu) {
      return item.submenu.some((sub) => currentView === sub.view);
    }
    return false;
  };
  const isSubmenuActive = (sub) => currentView === sub.view;

  // Toggle submenu open/close (expanded mode)
  const handleMenuClick = (idx, hasSubmenu) => {
    if (isCollapsed && !isMobile) return;
    if (hasSubmenu) {
      setOpenMenu(openMenu === idx ? null : idx);
    }
  };

  const handleMenuItemClick = (view) => {
    onViewChange(view);
    // Close mobile menu after selection
    if (isMobile && onMobileMenuToggle) {
      onMobileMenuToggle();
    }
  };

  const dashboardNavLinks = [
    { label: "Dashboard", view: "dashboard" },
    { label: "Orders", view: "orders" },
    { label: "Products", view: "products" },
    { label: "Categories", view: "categories" },
    { label: "Attributes", view: "attributes" },
    { label: "Coupons", view: "coupons" },
    { label: "Shipping Fees", view: "shippingFees" },
    { label: "Payments", view: "payments" },
    { label: "Reviews", view: "reviews" },
    { label: "Customers", view: "customers" },
    { label: "Admins", view: "admins" },
    { label: "Wishlist", view: "wishlist" },
    { label: "SEO", view: "seo" },
    { label: "Policies", view: "policies"}
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="sidebar-mobile-overlay" 
          onClick={onMobileMenuToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`sidebar-v2${isCollapsed ? " collapsed" : ""}${isMobile && isMobileMenuOpen ? " mobile-open" : ""}`}> 
        {/* Header */}
        <div className="sidebar-v2-header">
          <div className="sidebar-v2-logo">
            <img 
              src="/crosscoin icon.png"
              alt="CrossCoin Logo" 
              width="36" 
              height="36" 
              style={{ objectFit: 'contain' }}
            />
            {(!isCollapsed || (isMobile && isMobileMenuOpen)) && (
              <span className="sidebar-v2-title">
                CrossCoin<br />
                <span className="sidebar-v2-subtitle">ADMIN PANEL</span>
              </span>
            )}
          </div>
          {isMobile && isMobileMenuOpen ? (
            <button className="sidebar-v2-toggle sidebar-mobile-close" aria-label="Close menu" onClick={onMobileMenuToggle}>
              <FaTimes />
            </button>
          ) : (
            !isMobile && (
              <button className="sidebar-v2-toggle" aria-label="Toggle sidebar" onClick={onToggleCollapse}>
                {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
            )
          )}
        </div>
        {/* Menu */}
        <nav className="sidebar-v2-menu">
          {menu.map((item, idx) => (
            <div
              key={item.label}
              className={`sidebar-v2-menu-item${isMenuActive(item) ? " active" : ""}${openMenu === idx ? " open" : ""}`}
              onMouseEnter={() => !isMobile && isCollapsed && setHoveredMenu(idx)}
              onMouseLeave={() => !isMobile && isCollapsed && setHoveredMenu(null)}
            >
              <div
                className={`sidebar-v2-menu-link${isMenuActive(item) ? " active" : ""}`}
                onClick={() => {
                  if (item.submenu) {
                    handleMenuClick(idx, true);
                  } else {
                    handleMenuItemClick(item.view);
                  }
                }}
              >
                <span className="sidebar-v2-icon">{item.icon}</span>
                {(!isCollapsed || (isMobile && isMobileMenuOpen)) && <span>{item.label}</span>}
                {item.submenu && (!isCollapsed || (isMobile && isMobileMenuOpen)) && (
                  <FaChevronDown className={`sidebar-v2-chevron${openMenu === idx ? " open" : ""}`} />
                )}
              </div>
              {/* Submenu (expanded) */}
              {item.submenu && openMenu === idx && (!isCollapsed || (isMobile && isMobileMenuOpen)) && (
                <div className="sidebar-v2-submenu">
                  {item.submenu.map((sub) => (
                    <div
                      key={sub.label}
                      className={`sidebar-v2-submenu-link${isSubmenuActive(sub) ? " active" : ""}`}
                      onClick={() => handleMenuItemClick(sub.view)}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
              {/* Submenu (collapsed, tooltip style) - Desktop only */}
              {item.submenu && !isMobile && isCollapsed && hoveredMenu === idx && (
                <div className="sidebar-v2-tooltip-menu">
                  {item.submenu.map((sub) => (
                    <div
                      key={sub.label}
                      className={`sidebar-v2-tooltip-link${isSubmenuActive(sub) ? " active" : ""}`}
                      onClick={() => handleMenuItemClick(sub.view)}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
              {/* Tooltip for collapsed main menu - Desktop only */}
              {!isMobile && isCollapsed && !item.submenu && hoveredMenu === idx && (
                <div className="sidebar-v2-tooltip-label">{item.label}</div>
              )}
            </div>
          ))}
        </nav>
        {/* Footer */}
        <div className="sidebar-v2-footer">
          <button 
            className="sidebar-v2-help" 
            aria-label="Help"
            onClick={handleHelpClick}
          >
            <FaQuestionCircle />
            {(!isCollapsed || (isMobile && isMobileMenuOpen)) && <span>Need help?</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 