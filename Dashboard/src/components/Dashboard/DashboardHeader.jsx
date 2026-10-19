import { getPageTitle } from "../../utils/dashboardRouting";
import { findInMenu } from "../Sidebar/menu";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import GlobalSearch from "./GlobalSearch";
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Sun03Icon, Moon02Icon, ComputerIcon } from '@hugeicons/core-free-icons';

const icon = (i, size = 18) => <HugeiconsIcon icon={i} size={size} strokeWidth={2} aria-hidden="true" />;

const THEME = {
  auto:  { icon: ComputerIcon, label: (eff) => `Theme: automatic (dark at night, now ${eff}). Switch to light` },
  light: { icon: Sun03Icon,    label: () => 'Theme: light. Switch to dark' },
  dark:  { icon: Moon02Icon,   label: () => 'Theme: dark. Switch to automatic' },
};

// Top bar: where you are (menu group + page name), search, notifications,
// light/dark and your profile. On phones: ☰ opens the menu and the actions
// are icons only.
function DashboardHeader({ currentView, isMobile, isMobileMenuOpen, onMobileMenuToggle, theme, themeMode, onToggleTheme }) {
  const place = findInMenu(currentView);
  const crumb = place ? [place.group.label, place.child ? place.item.label : null].filter(Boolean).join(' · ') : null;
  const t = THEME[themeMode] || THEME.auto;

  return (
    <header className="dh">
      <div className="dh-left">
        {isMobile && (
          <button
            type="button"
            className="dh-hamburger"
            onClick={onMobileMenuToggle}
            aria-label="Open the menu"
            aria-controls="dashboard-menu"
            aria-expanded={!!isMobileMenuOpen}
          >
            {icon(Menu01Icon, 20)}
          </button>
        )}
        <div className="dh-heading">
          {crumb && <span className="dh-crumb">{crumb}</span>}
          <span className="dh-title">{getPageTitle(currentView)}</span>
        </div>
      </div>
      <div className="dh-right">
        <GlobalSearch />
        <NotificationBell />
        {onToggleTheme && (
          <button type="button" className="dh-action" onClick={onToggleTheme} aria-label={t.label(theme)} title={t.label(theme)}>
            {icon(t.icon, 17)}
          </button>
        )}
        <span className="dh-divider" aria-hidden="true" />
        <ProfileMenu />
      </div>
    </header>
  );
}

export default DashboardHeader;
