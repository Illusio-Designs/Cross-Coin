import ShippingFees from "./shippingFees";

// The old "Courier Webhooks" view is now the courier-updates log on the
// Shipping & courier page — same page, scrolled to the log.
export default function WebhookEvents() {
  return <ShippingFees focus="log" />;
}
