# CrossCoin Live View Globe

Shopify-style live globe for your Next.js storefront, powered by GA4 Real-Time API.

---

## Files

```
components/
  LiveGlobe.tsx        ← main component (drop into your /components folder)
app/
  live/page.tsx        ← example route at /live
  api/ga4-token/route.ts ← server-side token refresh endpoint
```

---

## 1. Install dependencies

```bash
npm install cobe jose
```

---

## 2. GA4 Setup

### A. Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts
2. Create a new service account
3. Generate a JSON key and download it
4. Copy the `client_email` and `private_key` values

### B. Grant GA4 access

1. Open [Google Analytics](https://analytics.google.com/) → Admin → Property Access Management
2. Add the service account email with **Viewer** role

### C. Get your Property ID

Admin → Property Settings → copy the **Property ID** (numeric).
Your env var should be `properties/YOUR_NUMERIC_ID`.

---

## 3. Environment variables

Add to `.env.local`:

```env
GA4_PROPERTY_ID=properties/123456789
GA4_SA_EMAIL=my-sa@my-project.iam.gserviceaccount.com
GA4_SA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

> **Tip**: In the private key string, replace actual newlines with `\n` so it stays on one line.

---

## 4. Token refresh in LiveGlobe (optional)

The component currently accepts `accessToken` as a prop.
For production, fetch it from your `/api/ga4-token` route instead:

```tsx
// In your page or a parent component:
const [token, setToken] = useState("");

useEffect(() => {
  async function refreshToken() {
    const res = await fetch("/api/ga4-token");
    const { accessToken } = await res.json();
    setToken(accessToken);
  }
  refreshToken();
  // Refresh every 50 minutes
  const t = setInterval(refreshToken, 50 * 60 * 1000);
  return () => clearInterval(t);
}, []);

// Pass to globe:
<LiveGlobe propertyId={process.env.NEXT_PUBLIC_GA4_PROPERTY_ID!} accessToken={token} />
```

---

## 5. Order pings (real orders)

The component currently **simulates** order pings with random timing.
To wire in real orders, replace the simulation `useEffect` in `LiveGlobe.tsx`
with a WebSocket or Server-Sent Events connection to your Express backend:

```ts
useEffect(() => {
  const es = new EventSource("/api/orders/stream");
  es.onmessage = (e) => {
    const order = JSON.parse(e.data);
    // order = { city, lat, lng, ... }
    simulateOrderPing(order.lat, order.lng);
  };
  return () => es.close();
}, []);
```

---

## 6. Add more cities

Edit the `CITY_COORDS` map in `LiveGlobe.tsx`.
Keys must match the city name returned by GA4.

---

## Features

| Feature | Status |
|---|---|
| Rotating COBE globe | ✅ |
| Live visitor dots (sized by users) | ✅ |
| Traffic arcs from HQ → top cities | ✅ |
| Top locations sidebar with bar chart | ✅ |
| Order ping toasts | ✅ (demo; wire to real orders) |
| GA4 Real-Time API polling | ✅ |
| Service account token refresh API | ✅ |
| Dark mode | ✅ |
| Responsive (mobile) | ✅ |
