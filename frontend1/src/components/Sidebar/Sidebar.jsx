import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  FaHome, FaUser, FaCog, FaBox, FaClipboardList, FaChartBar, FaLock, FaChevronDown, FaChevronLeft, FaChevronRight, FaQuestionCircle
} from "react-icons/fa";

const sidebarData = [
  {
    label: "Dashboard",
    icon: <FaHome className="icon" />,
    href: "/dashboard",
  },
  {
    label: "Bank Profile",
    icon: <FaUser className="icon" />,
    children: [
      { label: "Bank Information", icon: <FaUser className="icon" />, href: "#" },
      { label: "Bank Products", icon: <FaBox className="icon" />, href: "#" },
    ],
  },
  {
    label: "Orders",
    icon: <FaClipboardList className="icon" />,
    children: [
      { label: "Order Management", icon: <FaClipboardList className="icon" />, href: "#" },
      { label: "Order Setting", icon: <FaClipboardList className="icon" />, href: "#" },
    ],
  },
  {
    label: "Inventory Management",
    icon: <FaBox className="icon" />,
    children: [
      { label: "Credit Cards", icon: <FaBox className="icon" />, href: "#" },
      { label: "Cars Inventory", icon: <FaBox className="icon" />, href: "#" },
      { label: "Property Inventory", icon: <FaBox className="icon" />, href: "#" },
    ],
  },
  {
    label: "Rule Management",
    icon: <FaLock className="icon" />,
    children: [
      { label: "Decision Rule", icon: <FaLock className="icon" />, href: "#" },
      { label: "Risk Grading", icon: <FaLock className="icon" />, href: "#" },
      { label: "Scoring", icon: <FaLock className="icon" />, href: "#" },
      { label: "Decision Flow", icon: <FaLock className="icon" />, href: "#" },
    ],
  },
  {
    label: "Admin",
    icon: <FaUser className="icon" />,
    children: [
      { label: "Role and Permission", icon: <FaUser className="icon" />, href: "#" },
      { label: "Security Settings", icon: <FaUser className="icon" />, href: "#" },
    ],
  },
  {
    label: "Reports",
    icon: <FaChartBar className="icon" />,
    children: [
      { label: "Credit Cards Reports", icon: <FaChartBar className="icon" />, href: "#" },
      { label: "Cars Reports", icon: <FaChartBar className="icon" />, href: "#" },
      { label: "Property Reports", icon: <FaChartBar className="icon" />, href: "#" },
    ],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [hovered, setHovered] = useState(null); // for tooltips
  const [dropdown, setDropdown] = useState(null); // for floating dropdowns

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

  // Dropdown position logic
  const showDropdown = (label, e) => {
    setDropdown({ label, x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top });
  };
  const hideDropdown = () => setDropdown(null);

  return (
    <>
      <aside className={`dashboard-sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ width: collapsed ? 70 : 250 }}>
        <div className="sidebar-header" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span style={{ fontSize: '2rem', color: '#CE1E36' }}>🦊</span>
          {!collapsed && <span style={{ marginLeft: 8 }}>Taurus</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#CE1E36',
              fontSize: '1.1rem',
              padding: 4,
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
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
                      <FaChevronDown
                        style={{
                          marginLeft: 'auto',
                          transform: openSections[item.label] ? 'rotate(180deg)' : undefined,
                          transition: 'transform 0.2s',
                        }}
                      />
                    )}
                  </div>
                  {/* Inline dropdown for expanded sidebar */}
                  {openSections[item.label] && !collapsed && (
                    <div className="sidebar-items">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`sidebar-link${isActive(child.href) ? ' active' : ''}`}
                          style={{ paddingLeft: 48 }}
                          onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
                          onMouseLeave={collapsed ? hideTooltip : undefined}
                        >
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
            <FaQuestionCircle className="help-icon" />
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
          onMouseLeave={hideDropdown}
        >
          {sidebarData.find((i) => i.label === dropdown.label)?.children?.map((child) => (
            <Link
              key={child.label}
              href={child.href}
              className="sidebar-link"
              style={{ padding: '0.6rem 1.2rem', borderRadius: 8, color: '#180D3E', background: 'none', fontWeight: 500 }}
              onMouseEnter={collapsed ? (e) => showTooltip(child.label, e) : undefined}
              onMouseLeave={collapsed ? hideTooltip : undefined}
            >
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