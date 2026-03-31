/**
 * CrossCoin — Live View page
 * Route: /live
 *
 * Place your GA4 Property ID and a valid access token below,
 * or pass them through environment variables / server props.
 */

import LiveGlobe from "@/components/LiveGlobe";

export const metadata = {
  title: "Live View — CrossCoin",
};

export default function LiveViewPage() {
  // In production, fetch these server-side and pass as props,
  // or use a /api/ga4-token route that handles OAuth refresh.
  const propertyId = process.env.GA4_PROPERTY_ID ?? "properties/XXXXXXXXX";
  const accessToken = process.env.GA4_ACCESS_TOKEN ?? "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#040608",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#e2e8f0",
            margin: 0,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          CrossCoin live view
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "#475569",
            margin: "4px 0 0",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Real-time visitors &amp; orders
        </p>
      </div>

      {/* Globe */}
      <LiveGlobe
        propertyId={propertyId}
        accessToken={accessToken}
        pollInterval={30_000}
      />
    </main>
  );
}
