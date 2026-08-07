import { getPageTitle } from "../../utils/dashboardRouting";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Maximize01Icon, Minimize01Icon, Sun03Icon, Moon02Icon } from '@hugeicons/core-free-icons';

const IC = {
  menu:     <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={2} />,
  maximize: <HugeiconsIcon icon={Maximize01Icon} size={17} strokeWidth={2} />,
  minimize: <HugeiconsIcon icon={Minimize01Icon} size={17} strokeWidth={2} />,
  sun:      <HugeiconsIcon icon={Sun03Icon} size={17} strokeWidth={2} />,
  moon:     <HugeiconsIcon icon={Moon02Icon} size={17} strokeWidth={2} />,
};

function DashboardHeader({ isFullscreen, onToggleFullscreen, currentView, isMobile, onMobileMenuToggle, theme, themeMode, onToggleTheme }) {
  return (
    <header className="dh">
      <div className="dh-left">
        {isMobile && (
          <button className="dh-hamburger" onClick={onMobileMenuToggle} aria-label="Open menu">
            {IC.menu}
          </button>
        )}
        <span className="dh-title">{getPageTitle(currentView)}</span>
      </div>
      <div className="dh-right">
        <NotificationBell />
        {onToggleTheme && (
          <button className="dh-action" onClick={onToggleTheme}
            title={themeMode === 'auto' ? `Theme: Auto — follows IST time (now ${theme}). Click for Light.` : themeMode === 'light' ? 'Theme: Light. Click for Dark.' : 'Theme: Dark. Click for Auto.'}
            aria-label="Toggle theme">
            {theme === 'dark' ? IC.sun : IC.moon}
          </button>
        )}
        <button className="dh-action" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
          {isFullscreen ? IC.minimize : IC.maximize}
        </button>
        <span className="dh-divider" aria-hidden="true" />
        <ProfileMenu />
      </div>
    </header>
  );
}

export default DashboardHeader;
