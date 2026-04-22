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
  
  // Minimal fetch event listener - THIS IS THE CRITICAL PART for installability
  self.addEventListener('fetch', (event) => {
    console.log('Service Worker: Fetching ', event.request.url);
    // This is the bare minimum fetch handler. It simply fetches the
    // resource from the network. It doesn't provide any offline capability.
    // It just fulfills the requirement that the fetch event is handled.
    event.respondWith(fetch(event.request));
  
    // An even more "do nothing" version, relying on browser default if
    // respondWith isn't called or its promise rejects, might technically work
    // in some cases, but explicitly handling it like above is clearer and safer:
    //
    // self.addEventListener('fetch', (event) => {
    //   // Just having the listener is often enough to pass the check
    // });
  });
