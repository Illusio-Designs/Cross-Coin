function DashboardFooter({ sidebarWidth, isMobile }) {
  return (
    <footer
      className="df"
      style={{
        left: isMobile ? 0 : sidebarWidth,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
      }}
    >
      &copy; {new Date().getFullYear()} CrossCoin. All rights reserved.
    </footer>
  );
}

export default DashboardFooter;
