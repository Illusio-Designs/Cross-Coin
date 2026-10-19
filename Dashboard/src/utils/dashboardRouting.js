// Separate routing utilities to avoid Fast Refresh issues
// Page names shown in the header (and matching the menu labels in
// components/Sidebar/menu.js).
export const getPageTitle = (view) => {
  const titles = {
    'main': 'Today',
    'products': 'Products & stock',
    'categories': 'Categories',
    'pack-pricing': 'Pack prices',
    'attributes': 'Attributes',
    'orders': 'Orders',
    'returns': 'Problems',
    'payments': 'Payments',
    'ndr': 'Problems',
    'consumers': 'Customers',
    'customer': 'Customer',
    'shippingFees': 'Shipping & courier',
    'webhook-events': 'Shipping & courier',
    'coupons': 'Coupons',
    'reviews': 'Reviews',
    'seo': 'SEO',
    // Legacy deep-link views — all open the unified SEO hub on the
    // matching tab. Titles describe the tab so the header stays accurate
    // when an admin arrives from a bookmark.
    'seo-global': 'SEO — Settings',
    'seo-health': 'SEO — Overview',
    'seo-bulk':   'SEO — Products',
    'seo-pages':  'SEO — Pages',
    'faqs':       'SEO — FAQs',
    'policies': 'Policies',
    'blogs': 'Blog',
    'whatsapp': 'WhatsApp',
    'whatsapp-chat': 'WhatsApp',
    'brands': 'Brands',
    'brand-settings': 'Brands',
    'slider': 'Sliders',
    'media-gallery': 'Photos',
    'reports': 'Reports',
    'revenue-profit': 'Revenue & Profit',
    'traffic-report': 'Traffic',
    'leads': 'Leads',
    'loyalty': 'Loyalty',
    'staff-users': 'Staff',
    'system-health': 'System health',
  };
  return titles[view] || 'Today';
};

export const handleViewChange = (view, setCurrentView) => {
  if (view === 'logout') {
    window.location.href = '/login';
  } else {
    setCurrentView(view);
    // Update URL without page reload using browser history API
    const newUrl = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
    window.history.pushState({}, '', newUrl);
  }
};

export const getViewFromPath = () => {
  const path = window.location.pathname;
  if (path === '/dashboard') {
    return 'main';
  } else if (path.startsWith('/dashboard/')) {
    return path.split('/dashboard/')[1];
  }
  return 'main';
};