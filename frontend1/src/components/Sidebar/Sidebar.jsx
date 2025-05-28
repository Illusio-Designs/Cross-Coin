import SidebarItem from "./SidebarItem.jsx";
import { FaHome, FaUser, FaCog, FaBox, FaClipboardList, FaChartBar, FaLock, FaChevronDown } from "react-icons/fa";
import { useState } from "react";

export default function Sidebar() {
  const [open, setOpen] = useState({
    inventory: false,
    rule: false,
    admin: false,
    reports: false,
  });
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <span style={{fontSize: '2rem', color: '#CE1E36'}}>🦊</span> Taurus
      </div>
      <div className="sidebar-section">
        <SidebarItem icon={<FaHome className="icon" />} label="Dashboard" href="/dashboard" />
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Bank Profile</div>
        <div className="sidebar-items">
          <SidebarItem icon={<FaUser className="icon" />} label="Bank Information" href="#" />
          <SidebarItem icon={<FaBox className="icon" />} label="Bank Products" href="#" />
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Orders</div>
        <div className="sidebar-items">
          <SidebarItem icon={<FaClipboardList className="icon" />} label="Order Management" href="#" />
          <SidebarItem icon={<FaClipboardList className="icon" />} label="Order Setting" href="#" />
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title" onClick={() => setOpen(o => ({...o, inventory: !o.inventory}))} style={{cursor:'pointer'}}>
          Inventory Management <FaChevronDown style={{fontSize:'0.8rem', marginLeft:4, transform: open.inventory ? 'rotate(180deg)' : undefined}} />
        </div>
        {open.inventory && (
          <div className="sidebar-items">
            <SidebarItem icon={<FaBox className="icon" />} label="Credit Cards" href="#" />
            <SidebarItem icon={<FaBox className="icon" />} label="Cars Inventory" href="#" />
            <SidebarItem icon={<FaBox className="icon" />} label="Property Inventory" href="#" />
          </div>
        )}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title" onClick={() => setOpen(o => ({...o, rule: !o.rule}))} style={{cursor:'pointer'}}>
          Rule Management <FaChevronDown style={{fontSize:'0.8rem', marginLeft:4, transform: open.rule ? 'rotate(180deg)' : undefined}} />
        </div>
        {open.rule && (
          <div className="sidebar-items">
            <SidebarItem icon={<FaLock className="icon" />} label="Decision Rule" href="#" />
            <SidebarItem icon={<FaLock className="icon" />} label="Risk Grading" href="#" />
            <SidebarItem icon={<FaLock className="icon" />} label="Scoring" href="#" />
            <SidebarItem icon={<FaLock className="icon" />} label="Decision Flow" href="#" />
          </div>
        )}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title" onClick={() => setOpen(o => ({...o, admin: !o.admin}))} style={{cursor:'pointer'}}>
          Admin <FaChevronDown style={{fontSize:'0.8rem', marginLeft:4, transform: open.admin ? 'rotate(180deg)' : undefined}} />
        </div>
        {open.admin && (
          <div className="sidebar-items">
            <SidebarItem icon={<FaUser className="icon" />} label="Role and Permission" href="#" />
            <SidebarItem icon={<FaUser className="icon" />} label="Security Settings" href="#" />
          </div>
        )}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title" onClick={() => setOpen(o => ({...o, reports: !o.reports}))} style={{cursor:'pointer'}}>
          Reports <FaChevronDown style={{fontSize:'0.8rem', marginLeft:4, transform: open.reports ? 'rotate(180deg)' : undefined}} />
        </div>
        {open.reports && (
          <div className="sidebar-items">
            <SidebarItem icon={<FaChartBar className="icon" />} label="Credit Cards Reports" href="#" />
            <SidebarItem icon={<FaChartBar className="icon" />} label="Cars Reports" href="#" />
            <SidebarItem icon={<FaChartBar className="icon" />} label="Property Reports" href="#" />
          </div>
        )}
      </div>
      <div className="sidebar-footer">
        <div>Need help? <br /><a href="#" className="login-link">Go to Help Center →</a></div>
      </div>
    </aside>
  );
} 