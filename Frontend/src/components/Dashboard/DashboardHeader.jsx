import { FiMaximize, FiMinimize, FiMenu } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import { getPageTitle } from "../../utils/dashboardRouting";
import { useState, useEffect } from "react";
import "../../styles/dashboard/header.css";

function DashboardHeader({ isCollapsed, isFullscreen, onToggleFullscreen, currentView, sidebarWidth, isMobile, onMobileMenuToggle }) {
  const [isSmallMobile, setIsSmallMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsSmallMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const headerHeight = isSmallMobile ? 60 : 80;
  const fontSize = isSmallMobile ? '1.1rem' : '1.7rem';
  const iconSize = isSmallMobile ? 20 : 24;
  const profileSize = isSmallMobile ? 24 : 28;
  const labelSize = isSmallMobile ? '0.95rem' : '1.15rem';
  const padding = isSmallMobile ? '0 12px' : '0 20px';

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
        height: headerHeight,
        background: '#F3F4F5',
        borderBottom: '1px solid #E6E6E6',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        padding: padding,
      }}
    >
      {/* Left group: Hamburger (mobile) + Title */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: isSmallMobile ? 10 : 14 }}>
        {isMobile && (
          <button
            onClick={onMobileMenuToggle}
            className="hamburger-menu-btn"
            style={{
              background: '#180D3E',
              border: 'none',
              cursor: 'pointer',
              fontSize: iconSize,
              color: '#ffffff',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isSmallMobile ? 38 : 44,
              height: isSmallMobile ? 38 : 44,
              borderRadius: '10px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(24, 13, 62, 0.2)',
            }}
            title="Open Menu"
          >
            <FiMenu />
          </button>
        )}
        <div 
          className="header-title" 
          style={{ 
            fontWeight: 700, 
            fontSize: fontSize, 
            color: '#180D3E', 
            letterSpacing: 0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2
          }}
        >
          {getPageTitle(currentView)}
        </div>
      </div>
      {/* Right group: Fullscreen button + Profile icon + Admin label */}
      <div 
        className="header-actions" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isSmallMobile ? 8 : 14, 
          minWidth: isSmallMobile ? 80 : 120, 
          justifyContent: 'flex-end',
          flexShrink: 0
        }}
      >
        {!isSmallMobile && (
          <button
            onClick={onToggleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: iconSize,
              color: '#180D3E',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              marginRight: 0,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          </button>
        )}
        <FaUserCircle style={{ fontSize: profileSize, color: '#180D3E' }} />
        {!isSmallMobile && (
          <span style={{ fontWeight: 600, color: '#180D3E', fontSize: labelSize, letterSpacing: 0.2 }}>
            Admin
          </span>
        )}
      </div>
    </header>
  );
}

export default DashboardHeader;