// Load testing script for Cross-Coin API - Node.js version
// Run with: node load-test-node.js
// Simulates multi-user concurrent load testing without requiring k6

const axios = require('axios');
const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-token-placeholder';
const DURATION_SECONDS = 30; // Duration of test
const MAX_CONCURRENT_USERS = 50; // Max concurrent connections
const RAMP_UP_TIME = 10; // Seconds to reach max users

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: [],
  responseTimes: [],
  startTime: null,
  endTime: null,
};

// Create axios instance with custom agent
const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: MAX_CONCURRENT_USERS }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: MAX_CONCURRENT_USERS }),
  validateStatus: () => true, // Don't throw on any status code
});

// API endpoints to test
const endpoints = [
  { method: 'GET', path: '/api/orders?page=1&limit=10', name: 'Get Orders' },
  { method: 'GET', path: '/api/products?page=1&limit=10', name: 'Get Products' },
  { method: 'GET', path: '/api/categories', name: 'Get Categories' },
  { method: 'GET', path: '/api/coupons', name: 'Get Coupons' },
];

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'User-Agent': 'Load-Tester/1.0',
};

// Make a single request and track metrics
async function makeRequest(endpoint) {
  const startTime = Date.now();
  try {
    const url = `${API_URL}${endpoint.path}`;
    const response = await axiosInstance({
      method: endpoint.method,
      url,
      headers,
    });

    const duration = Date.now() - startTime;
    metrics.responseTimes.push(duration);

    if (response.status >= 200 && response.status < 300) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      metrics.errors.push({
        endpoint: endpoint.name,
        status: response.status,
        duration,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.failedRequests++;
    metrics.errors.push({
      endpoint: endpoint.name,
      error: error.message,
      duration,
    });
  }
  metrics.totalRequests++;
}

// Simulate load with concurrent users
async function simulateLoad() {
  metrics.startTime = Date.now();
  const startTime = metrics.startTime;
  const rampUpInterval = (RAMP_UP_TIME * 1000) / MAX_CONCURRENT_USERS;

  console.log('🚀 Starting load test...');
  console.log(`⏱️  Duration: ${DURATION_SECONDS}s`);
  console.log(`👥 Max concurrent users: ${MAX_CONCURRENT_USERS}`);
  console.log(`📍 API URL: ${API_URL}`);
  console.log('');

  // Track active users
  let activeUsers = 0;
  const userPromises = [];

  // Ramp up users gradually
  for (let i = 0; i < MAX_CONCURRENT_USERS; i++) {
    setTimeout(async () => {
      activeUsers++;
      process.stdout.write(`\r📈 Ramping up: ${activeUsers}/${MAX_CONCURRENT_USERS} users`);
    }, i * rampUpInterval);
  }

  // Run requests for each user
  for (let userIdx = 0; userIdx < MAX_CONCURRENT_USERS; userIdx++) {
    const userPromise = (async () => {
      // Wait for ramp-up
      await new Promise(resolve => setTimeout(resolve, userIdx * rampUpInterval));

      // Make requests for this user until test duration ends
      while (Date.now() - startTime < DURATION_SECONDS * 1000) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        await makeRequest(endpoint);
        // Small delay between requests for the same user
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));
      }
    })();

    userPromises.push(userPromise);
  }

  // Wait for all users to complete
  await Promise.all(userPromises);
  metrics.endTime = Date.now();
}

// Calculate statistics
function calculateStats() {
  const times = metrics.responseTimes.sort((a, b) => a - b);
  const totalTime = metrics.endTime - metrics.startTime;

  return {
    totalTime: totalTime / 1000,
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    errorRate: ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2),
    requestsPerSecond: (metrics.totalRequests / (totalTime / 1000)).toFixed(2),
    responseTime: {
      min: times[0],
      max: times[times.length - 1],
      avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
    },
  };
}

// Print results
function printResults() {
  const stats = calculateStats();

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  LOAD TEST SUMMARY REPORT                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 EXECUTION SUMMARY');
  console.log('─'.repeat(60));
  console.log(`   Total Duration:       ${stats.totalTime.toFixed(2)} seconds`);
  console.log(`   Max Concurrent Users: ${MAX_CONCURRENT_USERS}`);
  console.log(`   Total Requests:       ${stats.totalRequests}`);
  console.log(`   Requests/Second:      ${stats.requestsPerSecond}`);
  console.log('');

  console.log('✅ SUCCESS/FAILURE STATS');
  console.log('─'.repeat(60));
  console.log(`   Successful:  ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Failed:      ${stats.failedRequests} (${stats.errorRate}%)`);
  console.log('');

  console.log('⏱️  RESPONSE TIME STATISTICS (milliseconds)');
  console.log('─'.repeat(60));
  console.log(`   Min:         ${stats.responseTime.min} ms`);
  console.log(`   Max:         ${stats.responseTime.max} ms`);
  console.log(`   Average:     ${stats.responseTime.avg} ms`);
  console.log(`   Median:      ${stats.responseTime.median} ms`);
  console.log(`   p95:         ${stats.responseTime.p95} ms`);
  console.log(`   p99:         ${stats.responseTime.p99} ms`);
  console.log('');

  console.log('🎯 PERFORMANCE ASSESSMENT');
  console.log('─'.repeat(60));

  const checks = [
    {
      name: 'p95 Response Time < 500ms',
      pass: stats.responseTime.p95 < 500,
      actual: `${stats.responseTime.p95} ms`,
    },
    {
      name: 'p99 Response Time < 1000ms',
      pass: stats.responseTime.p99 < 1000,
      actual: `${stats.responseTime.p99} ms`,
    },
    {
      name: 'Error Rate < 0.1%',
      pass: parseFloat(stats.errorRate) < 0.1,
      actual: `${stats.errorRate}%`,
    },
    {
      name: 'Requests/Second > 10',
      pass: parseFloat(stats.requestsPerSecond) > 10,
      actual: `${stats.requestsPerSecond}/sec`,
    },
  ];

  checks.forEach(check => {
    const symbol = check.pass ? '✅' : '⚠️ ';
    console.log(`   ${symbol} ${check.name.padEnd(30)} ${check.actual}`);
  });

  console.log('');

  if (metrics.errors.length > 0 && metrics.errors.length <= 10) {
    console.log('⚠️  ERRORS ENCOUNTERED');
    console.log('─'.repeat(60));
    metrics.errors.slice(0, 10).forEach(err => {
      console.log(`   • ${err.endpoint || 'Unknown'}: ${err.error || `HTTP ${err.status}`}`);
    });
    if (metrics.errors.length > 10) {
      console.log(`   ... and ${metrics.errors.length - 10} more errors`);
    }
    console.log('');
  }

  console.log('🔍 RECOMMENDATIONS');
  console.log('─'.repeat(60));

  if (stats.responseTime.p95 > 500) {
    console.log('   • Response times are slow. Consider:');
    console.log('     - Enabling caching headers');
    console.log('     - Implementing pagination');
    console.log('     - Optimizing database queries');
    console.log('     - Adding CDN for static assets');
  } else {
    console.log('   ✅ Response times are excellent');
  }

  if (parseFloat(stats.errorRate) > 0.1) {
    console.log('   • Error rate is high. Check server logs for issues');
  } else {
    console.log('   ✅ Error rate is within acceptable limits');
  }

  console.log('');
  console.log('═'.repeat(60));
}

// Main execution
async function main() {
  try {
    console.log('Cross-Coin API Load Testing\n');
    await simulateLoad();
    printResults();
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();
