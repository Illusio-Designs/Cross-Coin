// Force Cache Clear Script
// This script will help clear all caches and force fresh CSS loading

console.log('🚀 Force Cache Clear Script');
console.log('============================');

// 1. Clear Service Worker Cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('📱 Clearing Service Worker caches...');
    registrations.forEach(registration => {
      registration.unregister();
      console.log('✅ Service Worker unregistered');
    });
  });
}

// 2. Clear Browser Cache
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    console.log('🗄️ Clearing browser caches...');
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log(`✅ Cache cleared: ${cacheName}`);
    });
  });
}

// 3. Clear localStorage
console.log('💾 Clearing localStorage...');
localStorage.clear();
console.log('✅ localStorage cleared');

// 4. Clear sessionStorage
console.log('📝 Clearing sessionStorage...');
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// 5. Force reload with cache bypass
console.log('🔄 Forcing page reload with cache bypass...');
setTimeout(() => {
  window.location.reload(true);
}, 1000);

console.log('✨ Cache clear complete! Page will reload in 1 second...');
