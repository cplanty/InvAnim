// Minimal install event listener
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    // skipWaiting() forces the waiting ServiceWorker to become the active
    // ServiceWorker. It's often used in minimal setups for faster activation,
    // but isn't strictly necessary for the absolute bare minimum install handler.
    // self.skipWaiting();
  });
  
  // Minimal activate event listener
  self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    // clients.claim() allows an active service worker to set itself as the
    // controller for all clients within its scope. Also often used but not
    // strictly the bare minimum activation handler.
    // event.waitUntil(self.clients.claim());
  });
  
  // Minimal fetch event listener - pass through to network
  self.addEventListener('fetch', (event) => {
    // Let the browser handle navigation requests normally
    if (event.request.mode === 'navigate') return;
    event.respondWith(fetch(event.request));
  });
