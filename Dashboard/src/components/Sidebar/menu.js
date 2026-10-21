// The Dashboard menu: groups → items → views, with the roles that may see
// each item. Used by the Sidebar (what to show) and the header (the crumb).
//
//   view      the dashboard view the item opens (/dashboard/<view>)
//   also      other views that light this item up (old links folded into it)
//   hint      sessionStorage 'obz-orders-status' value set before opening
//             (Problems = the Orders page opened on its Problems tab)
//   roles     roles that may see it (any one is enough); missing = all staff
//   count     key in GET /api/admin/nav-counts shown as a badge
//   children  sub-items (shown nested; a group with one visible child
//             collapses into a plain item that opens that child)
//
// The roles here are the visibility rules the menu has always had — change
// them only together with ROLE_VIEWS in context/AuthContext.jsx.
import {
  Home01Icon, ShoppingBag02Icon, Alert02Icon, CreditCardIcon, WhatsappIcon,
  UserMultiple02Icon, Target02Icon, GiftIcon, Package01Icon, Folder01Icon,
  Tag01Icon, Layers01Icon, Image01Icon, Discount01Icon, StarIcon,
  ChartLineData01Icon, SlidersHorizontalIcon, News01Icon, Search01Icon,
  File01Icon, Store01Icon, DeliveryTruck01Icon, UserCheck01Icon, Activity01Icon,
} from '@hugeicons/core-free-icons';

const ORDERS = ['admin', 'order_manager'];
const CATALOGUE = ['admin', 'product_manager'];
const ADMIN = ['admin'];

export const MENU = [
  {
    key: 'daily', label: 'Daily work', items: [
      { key: 'today', label: 'Today', view: 'main', icon: Home01Icon },
      { key: 'orders', label: 'Orders', view: 'orders', icon: ShoppingBag02Icon, roles: ORDERS, count: 'orders', countText: 'to confirm' },
      { key: 'problems', label: 'Problems', view: 'orders', hint: 'problems:all', also: ['ndr', 'returns'], icon: Alert02Icon, roles: ORDERS, count: 'problems', countText: 'open' },
      { key: 'payments', label: 'Payments', view: 'payments', icon: CreditCardIcon, roles: ORDERS },
      { key: 'whatsapp', label: 'WhatsApp', view: 'whatsapp', also: ['whatsapp-chat'], icon: WhatsappIcon, roles: ['admin', 'whatsapp_manager'], count: 'whatsapp', countText: 'unread' },
    ],
  },
  {
    key: 'customers', label: 'Customers', items: [
      { key: 'customers', label: 'Customers', view: 'consumers', also: ['customer'], icon: UserMultiple02Icon, roles: ORDERS },
      { key: 'leads', label: 'Leads', view: 'leads', icon: Target02Icon, roles: ADMIN },
      { key: 'loyalty', label: 'Loyalty', view: 'loyalty', icon: GiftIcon, roles: ORDERS },
    ],
  },
  {
    key: 'catalogue', label: 'Catalogue', items: [
      { key: 'products', label: 'Products & stock', view: 'products', icon: Package01Icon, roles: CATALOGUE, count: 'products', countText: 'out of stock' },
      { key: 'categories', label: 'Categories', view: 'categories', icon: Folder01Icon, roles: CATALOGUE },
      { key: 'attributes', label: 'Attributes', view: 'attributes', icon: Tag01Icon, roles: CATALOGUE },
      { key: 'pack-pricing', label: 'Pack prices', view: 'pack-pricing', icon: Layers01Icon, roles: ADMIN },
      { key: 'photos', label: 'Photos', view: 'media-gallery', icon: Image01Icon, roles: CATALOGUE },
    ],
  },
  {
    key: 'growth', label: 'Growth', items: [
      { key: 'coupons', label: 'Coupons', view: 'coupons', icon: Discount01Icon, roles: ORDERS },
      { key: 'reviews', label: 'Reviews', view: 'reviews', icon: StarIcon, roles: ORDERS, count: 'reviews', countText: 'waiting' },
      {
        key: 'reports', label: 'Reports', icon: ChartLineData01Icon, roles: ORDERS, children: [
          // Two tabbed pages (pages/dashboard/reports/ReportHub.jsx); the old
          // single-report views open the matching tab.
          { key: 'reports-sales', label: 'Sales', view: 'reports-sales', also: ['reports', 'revenue-profit', 'report-products', 'report-inventory', 'report-location'] },
          { key: 'reports-marketing', label: 'Marketing', view: 'reports-marketing', also: ['traffic-report', 'report-ads', 'report-coupons', 'report-customers'] },
        ],
      },
    ],
  },
  {
    key: 'website', label: 'Website', items: [
      { key: 'sliders', label: 'Sliders', view: 'slider', icon: SlidersHorizontalIcon, roles: CATALOGUE },
      { key: 'blog', label: 'Blog', view: 'blogs', icon: News01Icon, roles: CATALOGUE },
      { key: 'seo', label: 'SEO', view: 'seo', also: ['seo-global', 'seo-health', 'seo-bulk', 'seo-pages', 'faqs'], icon: Search01Icon, roles: CATALOGUE },
      { key: 'policies', label: 'Policies', view: 'policies', icon: File01Icon, roles: ADMIN },
    ],
  },
  {
    key: 'settings', label: 'Settings', items: [
      { key: 'brands', label: 'Brands', view: 'brands', also: ['brand-settings'], icon: Store01Icon, roles: ADMIN },
      // Courier updates (the old 'webhook-events' view) live on the Shipping page.
      { key: 'shipping', label: 'Shipping & courier', view: 'shippingFees', also: ['webhook-events'], icon: DeliveryTruck01Icon, roles: ADMIN },
      { key: 'staff', label: 'Staff', view: 'staff-users', icon: UserCheck01Icon, roles: ADMIN },
      { key: 'health', label: 'System health', view: 'system-health', icon: Activity01Icon, roles: ADMIN, count: 'health', countText: 'failed job in the last 24 hours', alert: true },
    ],
  },
];

const canSee = (allowed, roles) => !allowed || allowed.some((r) => roles.includes(r));

/** The menu as this user sees it (roles = the user's effective role set). */
export function menuForRoles(roles = []) {
  return MENU.map((g) => {
    const items = g.items
      .filter((it) => canSee(it.roles, roles))
      .map((it) => {
        if (!it.children) return it;
        const children = it.children.filter((c) => canSee(c.roles, roles));
        if (!children.length) return null;
        // One child left (e.g. order managers only get the Reports overview):
        // a plain item that opens it, keeping the parent's name and icon.
        if (children.length === 1) return { ...it, children: undefined, view: children[0].view, also: children[0].also };
        return { ...it, children };
      })
      .filter(Boolean);
    return items.length ? { ...g, items } : null;
  }).filter(Boolean);
}

/** Does this item (or one of its children) stand for the view? */
export const itemMatches = (it, view) =>
  it.view === view || (it.also || []).includes(view) || (it.children || []).some((c) => itemMatches(c, view));

/**
 * Where a view sits in the menu: { group, item, child } or null.
 * A plain view match wins over an `also` match, and an item without a
 * hand-off hint wins over one with (so 'orders' lights up Orders, not Problems).
 */
export function findInMenu(view, menu = MENU) {
  const passes = [
    (it) => !it.hint && (it.view === view || (it.children || []).some((c) => c.view === view)),
    (it) => itemMatches(it, view),
  ];
  for (const pass of passes) {
    for (const group of menu) {
      for (const item of group.items) {
        if (!pass(item)) continue;
        const child = (item.children || []).find((c) => itemMatches(c, view)) || null;
        return { group, item, child };
      }
    }
  }
  return null;
}
