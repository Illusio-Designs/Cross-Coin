import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
import Image from "next/image";
import {
  Home,
  User,
  Box,
  ClipboardList,
  BarChart2,
  Lock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ShoppingCart,
  CreditCard,
  Star,
  Settings,
  Tag,
  Truck,
  FileText,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

// Remove TaurusIcon and replace with CrossCoin logo
const CrossCoinLogo = () => (
  <Image
    src="/crosscoin icon.png"
    alt="CrossCoin Logo"
    width={38}
    height={38}
    style={{ objectFit: "contain" }}
  />
);

const sidebarData = [
  {
    label: "Dashboard",
    icon: <Home size={20} strokeWidth={1.7} className="icon" />,
    href: "/dashboard",
  },
  {
    label: "Products",
    icon: <Box size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "All Products", icon: <Box size={18} strokeWidth={1.7} className="icon" />, href: "/products" },
      { label: "Categories", icon: <Tag size={18} strokeWidth={1.7} className="icon" />, href: "/categories" },
      { label: "Attributes", icon: <Settings size={18} strokeWidth={1.7} className="icon" />, href: "/attributes" },
    ],
  },
  {
    label: "Orders",
    icon: <ClipboardList size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Order Management", icon: <ClipboardList size={18} strokeWidth={1.7} className="icon" />, href: "/orders" },
      { label: "Order Status", icon: <FileText size={18} strokeWidth={1.7} className="icon" />, href: "/order-status" },
    ],
  },
  {
    label: "Payments",
    icon: <CreditCard size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Payment Methods", icon: <CreditCard size={18} strokeWidth={1.7} className="icon" />, href: "/payments" },
      { label: "Coupons", icon: <Tag size={18} strokeWidth={1.7} className="icon" />, href: "/coupons" },
    ],
  },
  {
    label: "Shipping",
    icon: <Truck size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Shipping Addresses", icon: <Truck size={18} strokeWidth={1.7} className="icon" />, href: "/shipping-addresses" },
      { label: "Shipping Fees", icon: <CreditCard size={18} strokeWidth={1.7} className="icon" />, href: "/shipping-fees" },
    ],
  },
  {
    label: "Reviews",
    icon: <Star size={20} strokeWidth={1.7} className="icon" />,
    href: "/reviews",
  },
  {
    label: "Cart & Wishlist",
    icon: <ShoppingCart size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Shopping Cart", icon: <ShoppingCart size={18} strokeWidth={1.7} className="icon" />, href: "/cart" },
      { label: "Wishlist", icon: <Star size={18} strokeWidth={1.7} className="icon" />, href: "/wishlist" },
    ],
  },
  {
    label: "SEO",
    icon: <Settings size={20} strokeWidth={1.7} className="icon" />,
    href: "/seo",
  },
  {
    label: "Users",
    icon: <User size={20} strokeWidth={1.7} className="icon" />,
    href: "/users",
  },
  {
    label: "Logout",
    icon: <LogOut size={20} strokeWidth={1.7} className="icon" />,
    href: "/auth/adminlogin",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [hovered, setHovered] = useState(null); // for tooltips
  const [dropdown, setDropdown] = useState(null); // for floating dropdowns
  const dropdownTimeout = useRef();
  const dropdownRef = useRef();

  const handleToggleSection = (label) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href) => {
    return href && router.pathname === href;
  };

  // Tooltip position logic
  const showTooltip = (label, e) => {
    setHovered({ label, x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top });
  };
  const hideTooltip = () => setHovered(null);

  // Dropdown position logic with delay for mouse leave
  const showDropdown = (label, e) => {
    clearTimeout(dropdownTimeout.current);
    setDropdown({ label, x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top });
  };
  const hideDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setDropdown(null), 120);
  };
  const keepDropdown = () => {
    clearTimeout(dropdownTimeout.current);
  };

  return (
    <>
      <aside className={`dashboard-sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Sidebar Header */}
        {!collapsed ? (
          <div className="sidebar-header">
            <div className="sidebar-header-logo">
              <CrossCoinLogo />
              <div className="sidebar-header-text">
                <span className="sidebar-header-title">CrossCoin</span>
                <span className="sidebar-header-subtitle">ADMIN PANEL</span>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="sidebar-toggle-button"
              title="Collapse sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        ) : (
          <div className="sidebar-header collapsed">
            <CrossCoinLogo />
            <button
              onClick={() => setCollapsed(false)}
              className="sidebar-toggle-button collapsed"
              title="Expand sidebar"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <nav style={{ flex: 1 }}>
          {sidebarData.map((item) => (
            <div key={item.label} className="sidebar-section">
              {item.children ? (
                <>
                  <div
                    className={`sidebar-link${collapsed ? ' collapsed' : ''}`}
                    onClick={() => !collapsed && handleToggleSection(item.label)}
                    onMouseEnter={collapsed ? (e) => showDropdown(item.label, e) : undefined}
                    onMouseLeave={collapsed ? hideDropdown : undefined}
                    onFocus={collapsed ? (e) => showDropdown(item.label, e) : undefined}
                    onBlur={collapsed ? hideDropdown : undefined}
                  >
                    <span className="icon"
                      onMouseEnter={collapsed ? (e) => showTooltip(item.label, e) : undefined}
                      onMouseLeave={collapsed ? hideTooltip : undefined}
                    >{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && (
                      <ChevronDown
                        style={{
                          marginLeft: 'auto',
                          transform: openSections[item.label] ? 'rotate(180deg)' : undefined,
                          transition: 'transform 0.2s',
                        }}
                        size={16}
                        strokeWidth={1.7}
                      />
                    )}
                  </div>
                  {openSections[item.label] && !collapsed && (
                    <div className="sidebar-items">
                      <svg width="24" height={40 * item.children.length} style={{ position: 'absolute', left: 0, top: 18, zIndex: 0 }}>
                        <rect x="11" y="8" width="2" height={40 * item.children.length - 20} rx="1" fill="#E5E7EB" />
                        <path d="M12 8 Q12 20 24 20" stroke="#E5E7EB" strokeWidth="2" fill="none" />
                        {item.children.length > 1 && item.children.map((_, idx) => (
                          idx > 0 && idx < item.children.length - 1 ? (
                            <rect key={idx} x="12" y={40 * idx + 20} width="12" height="2" rx="1" fill="#E5E7EB" />
                          ) : null
                        ))}
                        {item.children.length > 1 && (
                          <rect x="12" y={40 * (item.children.length - 1) + 20} width="12" height="2" rx="1" fill="#E5E7EB" />
                        )}
                      </svg>
                      {item.children.map((child, idx) => (
                        <div key={child.label} style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: 1, minHeight: 40 }}>
                          <Link
                            href={child.href}
                            className={`sidebar-link${isActive(child.href) ? ' active' : ''}`}
                            onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
                            onMouseLeave={collapsed ? hideTooltip : undefined}
                          >
                            <span className="icon">{child.icon}</span>
                            {child.label}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`sidebar-link${isActive(item.href) ? ' active' : ''}${collapsed ? ' collapsed' : ''}`}
                  onMouseEnter={collapsed ? (e) => showTooltip(item.label, e) : undefined}
                  onMouseLeave={collapsed ? hideTooltip : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
        </div>
      </aside>
      {/* Floating dropdown for collapsed sidebar */}
      {collapsed && dropdown && (
        <div
          ref={dropdownRef}
          className="sidebar-dropdown"
          style={{
            top: dropdown.y + 8,
            left: dropdown.x + 8,
          }}
          onMouseEnter={keepDropdown}
          onMouseLeave={hideDropdown}
        >
          <span className="sidebar-dropdown-vertical-line" style={{
            height: 40 * (sidebarData.find((i) => i.label === dropdown.label)?.children.length || 1)
          }} />
          {sidebarData.find((i) => i.label === dropdown.label)?.children?.map((child, idx) => (
            <Link
              key={child.label}
              href={child.href}
              className="sidebar-dropdown-link"
              onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
              onMouseLeave={collapsed ? hideTooltip : undefined}
            >
              {idx !== sidebarData.find((i) => i.label === dropdown.label)?.children.length - 1 && (
                <span className="sidebar-dropdown-line" />
              )}
              <span className="icon">{child.icon}</span>
              {child.label}
            </Link>
          ))}
        </div>
      )}
      {/* Tooltip for collapsed sidebar */}
      {collapsed && hovered && (
        <div
          className="sidebar-tooltip visible"
          style={{
            top: hovered.y + 8,
            left: hovered.x + 8,
          }}
        >
          {hovered.label}
        </div>
      )}
    </>
  );
} 