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
    'payments': 'Payments',
    'coupons': 'Coupons',
    'reviews': 'Reviews',
    'seo': 'SEO',
    'policies': 'Policies',
    'brands': 'Brands',
    'brand-settings': 'Brand Settings',
    'slider': 'Slider',
    'media-gallery': 'Media Gallery',
    'utm-analytics': 'UTM Analytics'
  };
  return titles[view] || 'Dashboard';
};

export const handleViewChange = (view, setCurrentView) => {
  if (view === 'logout') {
    window.location.href = '/auth/adminlogin';
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