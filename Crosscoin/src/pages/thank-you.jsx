import { useRouter } from "next/router";
import { useEffect } from "react";
import { getUserOrders } from "../services/publicApi";
import { useAuth } from "../context/AuthContext";
import { fbqTrack } from "../utils/fbqTrack";
import { gtagTrack } from "../utils/gtagTrack";
import { gtagAdsPurchase } from "../utils/gtagAdsConversion";
import SeoWrapper from "../console/SeoWrapper";
import { fetchPageSeo } from "../utils/fetchPageSeo";

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('thank-you', ctx) } };
}

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconShoppingBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default function ThankYou({ seoData }) {
  const router = useRouter();
  const { order_number } = router.query;
  const { isAuthenticated } = useAuth();

  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Facebook Purchase tracking
  useEffect(() => {
    const trackPurchaseEvent = async () => {
      const trackingKey = `fb_purchase_tracked_${order_number}`;
      if (!order_number || sessionStorage.getItem(trackingKey)) return;

      const waitForFbq = (maxAttempts = 10) => new Promise(resolve => {
        let attempts = 0;
        const check = () => {
          if (typeof window !== 'undefined' && window.fbq) return resolve(true);
          if (attempts++ < maxAttempts) setTimeout(check, 200);
          else resolve(false);
        };
        check();
      });

      try {
        const fbqReady = await waitForFbq();
        if (!fbqReady) return;

        if (isAuthenticated) {
          const result = await getUserOrders({ limit: 100 });
          if (result.orders) {
            const order = result.orders.find(o => String(o.order_number) === String(order_number));
            if (order) {
              const purchaseData = {
                value: parseFloat(order.final_amount) || 0,
                currency: 'INR',
                content_type: 'product',
                contents: (order.OrderItems || []).map(i => ({
                  id: (i.variation_id || i.ProductVariation?.id)
                    ? `${i.Product?.id || i.product_id}_${i.variation_id || i.ProductVariation?.id}`
                    : String(i.Product?.id || i.product_id),
                  quantity: i.quantity || 1,
                })),
              };
              if (purchaseData.value > 0) {
                fbqTrack('Purchase', purchaseData, { eventID: `Purchase_${order_number}` });
                gtagTrack('purchase', {
                  transaction_id: order_number,
                  value: purchaseData.value,
                  currency: 'INR',
                  items: (order.OrderItems || []).map(i => ({
                    item_id: String(i.Product?.id || i.product_id),
                    item_name: i.Product?.name || '',
                    quantity: i.quantity || 1,
                    price: parseFloat(i.price || 0),
                  })),
                });
                // Google Ads purchase conversion (no-op until a label is set)
                gtagAdsPurchase({
                  transaction_id: order_number,
                  value: purchaseData.value,
                  currency: 'INR',
                });
                sessionStorage.setItem(trackingKey, 'true');
              }
            }
          }
        }
      } catch (_) {}
    };

    if (router.isReady && order_number) {
      const t = setTimeout(trackPurchaseEvent, 500);
      return () => clearTimeout(t);
    }
  }, [router.isReady, order_number, isAuthenticated]);

  return (
    <SeoWrapper pageName="thank-you" seoData={seoData}>
    <div className="ty-page">
      <div className="ty-card">
        <div className="ty-icon-wrap">
          <div className="ty-icon"><IconCheck /></div>
        </div>

        <h1 className="ty-title">Order Confirmed!</h1>
        {order_number && (
          <p className="ty-order-num">Order <span>#{order_number}</span></p>
        )}

        <div className="ty-info-strips">
          <div className="ty-strip">
            <span className="ty-strip-icon"><IconMail /></span>
            <span>Confirmation sent to your registered email</span>
          </div>
          <div className="ty-strip">
            <span className="ty-strip-icon"><IconPackage /></span>
            <span>Estimated delivery by <strong>{getDeliveryDate()}</strong></span>
          </div>
        </div>

        <div className="ty-actions">
          <button className="ty-btn-primary" onClick={() => router.push('/Products')}>
            <span className="ty-btn-icon"><IconShoppingBag /></span>
            Continue Shopping
          </button>
          <button className="ty-btn-outline" onClick={() => router.push('/profile')}>
            <span className="ty-btn-icon"><IconMapPin /></span>
            Track Your Order
          </button>
        </div>
      </div>
    </div>
    </SeoWrapper>
  );
}
