import { getPageTitle } from "../../utils/dashboardRouting";
import { useState, useEffect } from "react";

const IC = {
  menu: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  maximize: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  ),
  minimize: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
    </svg>
  ),
};

function DashboardHeader({ isCollapsed, isFullscreen, onToggleFullscreen, currentView, sidebarWidth, isMobile, onMobileMenuToggle }) {
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsSmallMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <header
      className="dh"
      style={{
        left: isMobile ? 0 : sidebarWidth,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        height: isSmallMobile ? 60 : 72,
      }}
    >
      <div className="dh-left">
        {isMobile && (
          <button className="dh-hamburger" onClick={onMobileMenuToggle} aria-label="Open menu">
            {IC.menu}
          </button>
        )}
        <span className="dh-title">{getPageTitle(currentView)}</span>
      </div>

      <div className="dh-right">
        <button
          className="dh-action"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? IC.minimize : IC.maximize}
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
