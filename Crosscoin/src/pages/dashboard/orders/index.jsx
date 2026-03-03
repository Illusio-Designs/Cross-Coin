// IMPORTANT: This file causes the sidebar/header/footer to disappear on refresh
// because it bypasses the main Dashboard layout.
// 
// RECOMMENDED FIX: Delete this file entirely and let the catch-all route 
// at /dashboard/[...slug].jsx handle the routing through the main Dashboard layout.
//
// To delete this file, run: rm Crosscoin/src/pages/dashboard/orders/index.jsx
//
// The orders page will still work at /dashboard/orders through the catch-all route.

import Dashboard from '../index';

export default Dashboard;

