import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
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
} from "lucide-react";

const sidebarData = [
  {
    label: "Dashboard",
    icon: <Home size={20} strokeWidth={1.7} className="icon" />,
    href: "/dashboard",
  },
  {
    label: "Bank Profile",
    icon: <User size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Bank Information", icon: <User size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Bank Products", icon: <Box size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
  {
    label: "Orders",
    icon: <ClipboardList size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Order Management", icon: <ClipboardList size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Order Setting", icon: <ClipboardList size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
  {
    label: "Inventory Management",
    icon: <Box size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Credit Cards", icon: <Box size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Cars Inventory", icon: <Box size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Property Inventory", icon: <Box size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
  {
    label: "Rule Management",
    icon: <Lock size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Decision Rule", icon: <Lock size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Risk Grading", icon: <Lock size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Scoring", icon: <Lock size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Decision Flow", icon: <Lock size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
  {
    label: "Admin",
    icon: <User size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Role and Permission", icon: <User size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Security Settings", icon: <User size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
  {
    label: "Reports",
    icon: <BarChart2 size={20} strokeWidth={1.7} className="icon" />,
    children: [
      { label: "Credit Cards Reports", icon: <BarChart2 size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Cars Reports", icon: <BarChart2 size={18} strokeWidth={1.7} className="icon" />, href: "#" },
      { label: "Property Reports", icon: <BarChart2 size={18} strokeWidth={1.7} className="icon" />, href: "#" },
    ],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [hovered, setHovered] = useState(null); // for tooltips
  const [dropdown, setDropdown] = useState(null); // for floating dropdowns
  const dropdownTimeout = useRef();

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
      <aside className={`dashboard-sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ width: collapsed ? 70 : 250 }}>
        <div className="sidebar-header" style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}>
          <span style={{ fontSize: '2rem', color: '#CE1E36' }}>🦊</span>
          {!collapsed && <span style={{ marginLeft: 8 }}>Taurus</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              marginLeft: 'auto',
              background: '#fff',
              border: 'none',
              cursor: 'pointer',
              color: '#7C3AED',
              fontSize: '1.1rem',
              padding: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(44,62,80,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              right: collapsed ? 10 : 16,
              top: 18,
              zIndex: 2,
              transition: 'right 0.2s',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav style={{ flex: 1 }}>
          {sidebarData.map((item) => (
            <div key={item.label} className="sidebar-section">
              {item.children ? (
                <>
                  <div
                    className="sidebar-link"
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', fontWeight: 600, cursor: 'pointer', position: 'relative' }}
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
                    {/* Vertical line for open dropdown */}
                    {!collapsed && openSections[item.label] && (
                      <span style={{
                        position: 'absolute',
                        left: 24,
                        top: 38,
                        width: 2,
                        height: 32 * (item.children.length),
                        background: '#E5E7EB',
                        borderRadius: 1,
                        zIndex: 0,
                        transition: 'height 0.2s',
                      }} />
                    )}
                  </div>
                  {/* Inline dropdown for expanded sidebar */}
                  {openSections[item.label] && !collapsed && (
                    <div className="sidebar-items">
                      {item.children.map((child, idx) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`sidebar-link${isActive(child.href) ? ' active' : ''}`}
                          style={{ paddingLeft: 48, position: 'relative' }}
                          onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
                          onMouseLeave={collapsed ? hideTooltip : undefined}
                        >
                          {/* Vertical line for dropdown children */}
                          {idx !== item.children.length - 1 && (
                            <span style={{
                              position: 'absolute',
                              left: 16,
                              top: 32,
                              width: 2,
                              height: 32,
                              background: '#E5E7EB',
                              borderRadius: 1,
                              zIndex: 0,
                            }} />
                          )}
                          <span className="icon">{child.icon}</span>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`sidebar-link${isActive(item.href) ? ' active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', fontWeight: 600 }}
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
          <div className="help-card">
            <HelpCircle className="help-icon" size={32} strokeWidth={1.7} />
            {!collapsed && <div style={{ marginTop: 4 }}>
              Need help? <br /><a href="#" className="help-link">Go to Help Center →</a>
            </div>}
          </div>
        </div>
      </aside>
      {/* Floating dropdown for collapsed sidebar */}
      {collapsed && dropdown && (
        <div
          className="sidebar-tooltip visible"
          style={{
            top: dropdown.y + 8,
            left: dropdown.x + 8,
            minWidth: 180,
            background: '#fff',
            color: '#180D3E',
            boxShadow: '0 4px 24px rgba(44,62,80,0.12)',
            borderRadius: 12,
            padding: '0.5rem 0',
            zIndex: 9999,
            position: 'fixed',
          }}
          onMouseEnter={keepDropdown}
          onMouseLeave={hideDropdown}
        >
          {/* Vertical line for floating dropdown */}
          <span style={{
            position: 'absolute',
            left: 24,
            top: 16,
            width: 2,
            height: 32 * (sidebarData.find((i) => i.label === dropdown.label)?.children.length || 1),
            background: '#E5E7EB',
            borderRadius: 1,
            zIndex: 0,
            transition: 'height 0.2s',
          }} />
          {sidebarData.find((i) => i.label === dropdown.label)?.children?.map((child, idx) => (
            <Link
              key={child.label}
              href={child.href}
              className="sidebar-link"
              style={{ padding: '0.6rem 1.2rem', borderRadius: 8, color: '#180D3E', background: 'none', fontWeight: 500, position: 'relative' }}
              onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
              onMouseLeave={collapsed ? hideTooltip : undefined}
            >
              {/* Vertical line for dropdown children */}
              {idx !== sidebarData.find((i) => i.label === dropdown.label)?.children.length - 1 && (
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: 32,
                  width: 2,
                  height: 32,
                  background: '#E5E7EB',
                  borderRadius: 1,
                  zIndex: 0,
                }} />
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
            zIndex: 99999,
            position: 'fixed',
            pointerEvents: 'none',
            background: '#181D2A',
            color: '#fff',
            borderRadius: 6,
            padding: '0.4rem 0.9rem',
            fontSize: '0.98rem',
            boxShadow: '0 2px 8px rgba(44,62,80,0.12)',
            opacity: 1,
          }}
        >
          {hovered.label}
        </div>
      )}
    </>
  );
} 