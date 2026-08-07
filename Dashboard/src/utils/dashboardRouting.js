// Separate routing utilities to avoid Fast Refresh issues
export const getPageTitle = (view) => {
  const titles = {
    'main': 'Dashboard',
    'products': 'Products',
    'categories': 'Categories',
    'attributes': 'Attributes',
    'orders': 'Orders',
    'consumers': 'Consumers',
    'shippingFees': 'Shipping Fees',
    'coupons': 'Coupons',
    'reviews': 'Reviews',
    'seo': 'SEO',
    // Legacy deep-link views — all open the unified SEO hub on the
    // matching tab. Titles describe the tab so the browser title stays
    // accurate when an admin navigates from a bookmark.
    'seo-global': 'SEO — Settings',
    'seo-health': 'SEO — Overview',
    'seo-bulk':   'SEO — Products',
    'seo-pages':  'SEO — Pages',
    'faqs':       'SEO — FAQs',
    'policies': 'Policies',
    'brands': 'Brands',
    'brand-settings': 'Brand Settings',
    'slider': 'Slider',
    'media-gallery': 'Media Gallery',
    'utm-analytics': 'UTM Analytics',
    'reports': 'Reports',
    'ads-reporting': 'Ads Reporting',
    'lookbooks': 'Lookbooks',
    'staff-users': 'Staff Users',
  };
  return titles[view] || 'Dashboard';
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