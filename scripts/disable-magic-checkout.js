#!/usr/bin/env node

/**
 * Disable Magic Checkout Script
 * 
 * This script disables Magic Checkout and reverts to traditional checkout
 * Run: node scripts/disable-magic-checkout.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Disabling Magic Checkout...\n');

const changes = [
  {
    file: 'Crosscoin/src/pages/UnifiedCheckout.jsx',
    changes: [
      {
        find: `import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// import ExpressCheckout from "../components/checkout/ExpressCheckout"; // COMMENTED OUT - Using normal checkout only`,
        replace: `// Magic Checkout components removed - using traditional checkout only
// import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// import ExpressCheckout from "../components/checkout/ExpressCheckout";`
      },
      {
        find: `  }, [shippingFee, appliedCoupon]); // Removed handleCouponRemoved from dependencies

  // Magic Checkout - Always show
  const [useMagicCheckout, setUseMagicCheckout] = useState(true);`,
        replace: `  }, [shippingFee, appliedCoupon]); // Removed handleCouponRemoved from dependencies`
      },
      {
        find: /  \/\/ Helper to load Razorpay script[\s\S]*?  \/\*\*\s*\n\s*\* Handle Magic Checkout error callback\s*\n\s*\*\/\s*\n\s*const handleMagicCheckoutError = \(error\) => \{[\s\S]*?\n  \};/,
        replace: `  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };`
      },
      {
        find: `      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Express Checkout - COMMENTED OUT - Using normal checkout only */}
          {/* {(cartItems.length > 0 || buyNowItem) && (
            <ExpressCheckout
              onSuccess={handleMagicCheckoutSuccess}
              onError={handleMagicCheckoutError}
            />
          )} */}

          {/* Products Section */}
          <CartStep`,
        replace: `      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Products Section */}
          <CartStep`
      },
      {
        find: /\s*\/\* Magic Checkout Integration \*\/[\s\S]*?<\/div>\s*\n\s*\)\}\s*\n\s*\}\s*\n\s*\)\}\s*\n\s*<\/div>\s*\n\s*\)\}\s*\n\s*\}\s*\n\s*<\/div>/,
        replace: `          </div>
        )}`
      }
    ]
  },
  {
    file: 'Crosscoin/src/pages/_app.jsx',
    changes: [
      {
        find: `import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import CartDrawer from "../components/cart/CartDrawer";
import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// Critical CSS only - loaded immediately`,
        replace: `import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import CartDrawer from "../components/cart/CartDrawer";
// Critical CSS only - loaded immediately`
      },
      {
        find: /function AppContent\(\{ Component, pageProps, progressRef \}\) \{[\s\S]*?const handleMagicCheckoutError = \(error\) => \{[\s\S]*?\n  \};\s*\n\s*return \(/,
        replace: `function AppContent({ Component, pageProps, progressRef }) {
  const { isDrawerOpen, setIsDrawerOpen, lastAddedItem, cartItems } = useCart();
  const { user } = useAuth();

  return (`
      },
      {
        find: /\s*\/\* Global Magic Checkout Integration - Hidden but always mounted \*\/[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n\s*\n\s*<ToastContainer/,
        replace: `      
      <ToastContainer`
      }
    ]
  },
  {
    file: 'Crosscoin/src/components/cart/CartDrawer.jsx',
    changes: [
      {
        find: /  const finalTotal = Math\.max\(0, cartTotal - discountAmount\);\s*\n\s*const handleCheckout = \(\) => \{[\s\S]*?  const handleFastCheckout = \(\) => \{[\s\S]*?\n  \};\s*\n/,
        replace: `  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleCheckout = () => {
    onClose();
    router.push('/UnifiedCheckout');
  };

`
      },
      {
        find: `              <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-drawer-buttons">
              <button className="cart-drawer-btn primary magic" onClick={handleFastCheckout}>
                ⚡ Fast Checkout (Magic)
              </button>
              
              <button className="cart-drawer-btn secondary" onClick={handleCheckout}>
                Regular Checkout
              </button>
            </div>`,
        replace: `              <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-drawer-buttons">
              <button className="cart-drawer-btn primary" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
            </div>`
      }
    ]
  },
  {
    file: 'Crosscoin/src/services/publicindex.js',
    changes: [
      {
        find: /\n\n\/\/ Magic Checkout APIs[\s\S]*?export const verifyMagicCheckoutPayment = async \(paymentData\) => \{[\s\S]*?\n\};/,
        replace: ''
      }
    ]
  },
  {
    file: 'Gripzus/src/services/publicindex.js',
    changes: [
      {
        find: /\n\n\/\/ Magic Checkout APIs[\s\S]*?export const verifyMagicCheckoutPayment = async \(paymentData\) => \{[\s\S]*?\n\};/,
        replace: ''
      }
    ]
  }
];

let successCount = 0;
let errorCount = 0;

changes.forEach(({ file, changes: fileChanges }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    errorCount++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  fileChanges.forEach(({ find, replace }) => {
    if (typeof find === 'string') {
      if (content.includes(find)) {
        content = content.replace(find, replace);
        modified = true;
      }
    } else {
      // RegExp
      if (find.test(content)) {
        content = content.replace(find, replace);
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
    successCount++;
  } else {
    console.log(`⚠️  No changes needed: ${file}`);
  }
});

console.log(`\n✨ Magic Checkout Disabled!`);
console.log(`   ✅ ${successCount} files updated`);
if (errorCount > 0) {
  console.log(`   ⚠️  ${errorCount} files had issues`);
}
console.log(`\n🎉 Traditional checkout (COD/Prepaid/Coupons) is now active!\n`);
