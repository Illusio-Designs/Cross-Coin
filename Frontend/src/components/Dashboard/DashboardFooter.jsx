import { useState, useEffect } from "react";

function DashboardFooter({ isCollapsed, sidebarWidth }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const footerHeight = isMobile ? 40 : 56;
  const fontSize = isMobile ? '0.75rem' : '0.9rem';
  const padding = isMobile ? '0 12px' : '0 20px';
  
  return (
    <footer
      className="dashboard-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        height: footerHeight,
        zIndex: 100,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F3F4F5',
        borderTop: '1px solid #E6E6E6',
        fontSize: fontSize,
        color: '#6b7280',
        padding: padding,
      }}
    >
      &copy; {new Date().getFullYear()} CrossCoin. All rights reserved.
    </footer>
  );
}

export default DashboardFooter;