// Load testing script for Cross-Coin API
// Run with: k6 run load-test.js
// Or: k6 run -u 50 -d 30s load-test.js (50 users for 30 seconds)

import http from 'k6/http';
import { check, group, sleep } from 'k6';

// API base URL
const API_URL = __ENV.API_URL || 'https://api.crosscoin.in';

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp-up: 0 to 10 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '3m', target: 100 }, // Ramp-up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users (stress test)
    { duration: '3m', target: 0 }, // Ramp-down: 100 to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.1'], // Error rate < 0.1%
    http_errors: ['count<5'], // Less than 5 HTTP errors
  },
};

// Mock token for testing
const TOKEN = __ENV.TEST_TOKEN || 'test-token-placeholder';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'X-Brand-Name': 'crosscoin',
};

export default function() {
  // Test 1: Get Orders
  group('Orders API', () => {
    const ordersRes = http.get(`${API_URL}/api/orders?page=1&limit=10`, { headers });
    check(ordersRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has data': (r) => r.body.includes('orders') || r.body.includes('data'),
    });
  });

  sleep(1);

  // Test 2: Get Products
  group('Products API', () => {
    const productsRes = http.get(`${API_URL}/api/products?page=1&limit=10`, { headers });
    check(productsRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has products': (r) => r.body.includes('products') || r.body.includes('data'),
    });
  });

  sleep(1);

  // Test 3: Get Payments
  group('Payments API', () => {
    const paymentsRes = http.get(`${API_URL}/api/payments?page=1&limit=10`, { headers });
    check(paymentsRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has payments': (r) => r.body.includes('payments') || r.body.includes('data'),
    });
  });

  sleep(1);

  // Test 4: Get Categories
  group('Categories API', () => {
    const categoriesRes = http.get(`${API_URL}/api/categories`, { headers });
    check(categoriesRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  // Test 5: Get Coupons
  group('Coupons API', () => {
    const couponsRes = http.get(`${API_URL}/api/coupons`, { headers });
    check(couponsRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(2);
}

// Thresholds setup for monitoring
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

// Helper for text summary
function textSummary(data, options) {
  const summaryText = `
╔══════════════════════════════════════════╗
║         LOAD TEST SUMMARY                ║
╚══════════════════════════════════════════╝

${data.metrics.http_req_duration?.summary?.data?.med ? `
Requests Performance:
├─ Min:  ${data.metrics.http_req_duration.summary.data.min}ms
├─ Med:  ${data.metrics.http_req_duration.summary.data.med}ms
├─ Avg:  ${data.metrics.http_req_duration.summary.data.avg}ms
├─ p95:  ${data.metrics.http_req_duration.summary.data['p(95)']}ms
└─ Max:  ${data.metrics.http_req_duration.summary.data.max}ms
` : ''}

Errors:
├─ HTTP Errors: ${data.metrics.http_errors?.value || 0}
├─ Failed Requests: ${data.metrics.http_req_failed?.value || 0}
└─ Error Rate: ${(((data.metrics.http_req_failed?.value || 0) / (data.metrics.http_reqs?.value || 1)) * 100).toFixed(2)}%

Summary:
├─ Total Requests: ${data.metrics.http_reqs?.value || 0}
├─ Total Duration: ${(data.state?.testRunDurationMs / 1000).toFixed(2)}s
├─ Data Sent: ${(data.metrics.data_sent?.value / 1024).toFixed(2)}KB
└─ Data Received: ${(data.metrics.data_received?.value / 1024).toFixed(2)}KB

Status:
${data.metrics.http_req_duration?.summary?.data['p(95)'] < 500 ? '✓ p95 < 500ms' : '✗ p95 >= 500ms'}
${(data.metrics.http_req_failed?.value || 0) / (data.metrics.http_reqs?.value || 1) < 0.001 ? '✓ Error rate < 0.1%' : '✗ Error rate >= 0.1%'}
  `;

  return summaryText;
}
