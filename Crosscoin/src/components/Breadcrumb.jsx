import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const Breadcrumb = () => {
  const router = useRouter();
  const { pathname } = router;

  // Define breadcrumb labels for each route
  const breadcrumbLabels = {
    "/": "Home",
    "/home": "Home",
    "/index": "Home",
    "/about": "About Us",
    "/collections": "Collections",
    "/contact": "Contact",
    "/products": "Products",
    "/product-details": "Product Details",
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
    const paths = pathname.split("/").filter((path) => path);
    
    let breadcrumbs = [
      { label: "Home", path: "/" }
    ];

    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = breadcrumbLabels[currentPath] || path.charAt(0).toUpperCase() + path.slice(1);
      
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
