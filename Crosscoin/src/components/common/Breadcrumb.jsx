import React, { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// Create a context for breadcrumb data
const BreadcrumbContext = createContext({
  customBreadcrumbs: null,
  setCustomBreadcrumbs: () => {},
});

// Export the provider
export const BreadcrumbProvider = ({ children }) => {
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState(null);

  return (
    <BreadcrumbContext.Provider value={{ customBreadcrumbs, setCustomBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

// Export the hook to use breadcrumb context
export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  return context;
};

// Turn a URL segment like "cross-coinr-performance-ankle-socks" into a
// human-readable label "Cross Coin® Performance Ankle Socks" — best
// effort, used only when the page hasn't supplied a customBreadcrumbs.
function humaniseSegment(seg) {
  try {
    const decoded = decodeURIComponent(seg);
    return decoded
      .replace(/-/g, ' ')
      .replace(/\br\b/g, '®')                  // "cross coin r" → "cross coin ®"
      .replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return seg;
  }
}

const Breadcrumb = () => {
  const router = useRouter();
  const { query } = router;
  // asPath is the ACTUAL URL the user sees (e.g. "/collections/cross-coin-r");
  // pathname is the route template ("/collections/[slug]") and would leak the
  // literal "[slug]" placeholder if used directly. Strip query string + hash.
  const url = (router.asPath || router.pathname || '').split('?')[0].split('#')[0];
  const pathname = router.pathname;
  const { customBreadcrumbs } = useBreadcrumb();

  // Define breadcrumb labels for each route
  const breadcrumbLabels = {
    "/": "Home",
    "/home": "Home",
    "/index": "Home",
    "/about": "About Us",
    "/collections": "Collections",
    "/contact": "Contact",
    "/products": "Products",
    "/Products": "Products",
    "/product-details": "Product Details",
    "/ProductDetails": "Product Details",
    "/search-results": "Search Results",
    "/wishlist": "Wishlist",
    "/profile": "My Profile",
    "/login": "Login",
    "/register": "Register",
    "/order-tracking": "Order Tracking",
    "/policy": "Policy",
    "/thank-you": "Thank You",
    "/unified-checkout": "Checkout",
  };

  // Generate breadcrumb items
  const generateBreadcrumbs = () => {
    // If custom breadcrumbs are provided, use them
    if (customBreadcrumbs && Array.isArray(customBreadcrumbs)) {
      return customBreadcrumbs;
    }

    // Walk the ACTUAL URL (asPath) so the user sees the resolved slug, not the
    // route template's literal "[slug]" placeholder.
    const urlPaths = url.split('/').filter(Boolean);

    let breadcrumbs = [{ label: 'Home', path: '/' }];
    let currentPath = '';
    urlPaths.forEach((seg, index) => {
      currentPath += `/${seg}`;
      let label = breadcrumbLabels[currentPath];
      if (!label) {
        // No static label — humanise the URL segment instead of falling
        // through to the literal "[slug]" placeholder.
        label = humaniseSegment(seg);
      }
      if (currentPath === '/Products' && query.category) {
        label = decodeURIComponent(query.category);
      }
      if (currentPath !== '/') {
        breadcrumbs.push({
          label,
          path: currentPath,
          isLast: index === urlPaths.length - 1,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumb on home page (either the route template or the URL).
  if (
    pathname === "/" || pathname === "/home" || pathname === "/index" ||
    url === "/" || url === "/home" || url === "/index"
  ) {
    return null;
  }

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <div className="breadcrumb__container">
        <ol className="breadcrumb__list">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="breadcrumb__item">
              {crumb.isLast ? (
                <span className="breadcrumb__current">{crumb.label}</span>
              ) : (
                <>
                  <Link href={crumb.path} className="breadcrumb__link">{crumb.label}</Link>
                  <span className="breadcrumb__separator">/</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumb;
