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

const Breadcrumb = () => {
  const router = useRouter();
  const { pathname, query } = router;
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

    const paths = pathname.split("/").filter((path) => path);
    
    let breadcrumbs = [
      { label: "Home", path: "/" }
    ];

    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      let label = breadcrumbLabels[currentPath] || path.charAt(0).toUpperCase() + path.slice(1);
      
      // Handle query parameters for dynamic labels
      if (currentPath === "/Products" && query.category) {
        label = decodeURIComponent(query.category);
      }
      
      // Don't add duplicate Home
      if (currentPath !== "/") {
        breadcrumbs.push({
          label,
          path: currentPath,
          isLast: index === paths.length - 1
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumb on home page
  if (pathname === "/" || pathname === "/home" || pathname === "/index") {
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
