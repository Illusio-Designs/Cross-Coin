function DashboardFooter({ isCollapsed }) {
  const sidebarWidth = isCollapsed ? 72 : 260;
  return (
    <footer
      className="dashboard-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        zIndex: 100,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)',
      }}
    >
      &copy; {new Date().getFullYear()} CrossCoin. All rights reserved.
    </footer>
  );
}

export default DashboardFooter;