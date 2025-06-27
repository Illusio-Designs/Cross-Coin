import React from 'react';
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  FaHome, FaUser, FaBox, FaClipboardList, FaChartBar, FaLock, FaChevronDown, FaChevronLeft, FaChevronRight, FaQuestionCircle, FaShoppingCart, FaCreditCard, FaStar, FaCog, FaTags, FaTruck, FaFileAlt, FaSignOutAlt, FaImages
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
    ]
  },
  {
    label: "Orders",
    icon: <FaClipboardList />,
    submenu: [
      { label: "Order Management", view: "orders" },
      { label: "Order Status", view: "orderStatus" },
    ]
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

const Sidebar = ({ isCollapsed, onToggleCollapse, onViewChange, currentView }) => {
  const [openMenu, setOpenMenu] = React.useState(null);
  const [hoveredMenu, setHoveredMenu] = React.useState(null);

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
    if (isCollapsed) return;
    if (hasSubmenu) {
      setOpenMenu(openMenu === idx ? null : idx);
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
    <aside className={`sidebar-v2${isCollapsed ? " collapsed" : ""}`}> 
      {/* Header */}
      <div className="sidebar-v2-header">
        <div className="sidebar-v2-logo">
          <Image src="/crosscoin icon.png" alt="CrossCoin Logo" width={36} height={36} />
          {!isCollapsed && <span className="sidebar-v2-title">CrossCoin<br /><span className="sidebar-v2-subtitle">ADMIN PANEL</span></span>}
        </div>
        <button className="sidebar-v2-toggle" onClick={onToggleCollapse}>
          {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>
      {/* Menu */}
      <nav className="sidebar-v2-menu">
        {menu.map((item, idx) => (
          <div
            key={item.label}
            className={`sidebar-v2-menu-item${isMenuActive(item) ? " active" : ""}${openMenu === idx ? " open" : ""}`}
            onMouseEnter={() => isCollapsed && setHoveredMenu(idx)}
            onMouseLeave={() => isCollapsed && setHoveredMenu(null)}
          >
            <div
              className={`sidebar-v2-menu-link${isMenuActive(item) ? " active" : ""}`}
              onClick={() => {
                if (item.submenu) {
                  handleMenuClick(idx, true);
                } else {
                  onViewChange(item.view);
                }
              }}
            >
              <span className="sidebar-v2-icon">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
              {item.submenu && !isCollapsed && (
                <FaChevronDown className={`sidebar-v2-chevron${openMenu === idx ? " open" : ""}`} />
              )}
            </div>
            {/* Submenu (expanded) */}
            {item.submenu && openMenu === idx && !isCollapsed && (
              <div className="sidebar-v2-submenu">
                {item.submenu.map((sub) => (
                  <div
                    key={sub.label}
                    className={`sidebar-v2-submenu-link${isSubmenuActive(sub) ? " active" : ""}`}
                    onClick={() => onViewChange(sub.view)}
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            )}
            {/* Submenu (collapsed, tooltip style) */}
            {item.submenu && isCollapsed && hoveredMenu === idx && (
              <div className="sidebar-v2-tooltip-menu">
                {item.submenu.map((sub) => (
                  <div
                    key={sub.label}
                    className={`sidebar-v2-tooltip-link${isSubmenuActive(sub) ? " active" : ""}`}
                    onClick={() => onViewChange(sub.view)}
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            )}
            {/* Tooltip for collapsed main menu */}
            {isCollapsed && !item.submenu && hoveredMenu === idx && (
              <div className="sidebar-v2-tooltip-label">{item.label}</div>
            )}
          </div>
        ))}
      </nav>
      {/* Footer */}
      <div className="sidebar-v2-footer">
        <button className="sidebar-v2-help">
          <FaQuestionCircle />
          {!isCollapsed && <span>Need help?</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 