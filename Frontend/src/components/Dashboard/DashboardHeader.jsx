import { FiMaximize, FiMinimize } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import { getPageTitle } from "../../utils/dashboardRouting";

function DashboardHeader({ isCollapsed, isFullscreen, onToggleFullscreen, currentView }) {
  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <header
      className="dashboard-header"
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        zIndex: 100,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 80,
        background: '#F3F4F5',
        borderBottom: '1px solid #E6E6E6',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        padding: '0 0',
      }}
    >
      {/* Left group: Title only */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 20 }}>
        <div className="header-title" style={{ fontWeight: 700, fontSize: '1.7rem', color: '#180D3E', letterSpacing: 0.2 }}>
          {getPageTitle(currentView)}
        </div>
      </div>
      {/* Right group: Fullscreen button + Profile icon + Admin label */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 14, marginRight: 40, minWidth: 120, justifyContent: 'flex-end' }}>
        <button
          onClick={onToggleFullscreen}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 26,
            color: '#180D3E',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            marginRight: 0
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <FiMinimize /> : <FiMaximize />}
        </button>
        <FaUserCircle style={{ fontSize: 28, color: '#180D3E' }} />
        <span style={{ fontWeight: 600, color: '#180D3E', fontSize: '1.15rem', letterSpacing: 0.2 }}>Admin</span>
      </div>
    </header>
  );
}

export default DashboardHeader;