/**
 * SERVICE WORKER - PWA Offline Support
 * Uses NETWORK-FIRST strategy so devices always get the latest code.
 * Falls back to cache only when offline.
 */

const CACHE_NAME = 'tidytribe-v7.1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/store.js',
  '/components/calendar.js',
  '/components/dashboard.js',
  '/components/members.js',
  '/components/chores.js',
  '/components/rewards.js',
  '/components/wishlists.js',
  '/components/modals.js',
  '/components/newModals.js',
  '/components/onboarding.js',
  '/utils/logger.js',
  '/utils/sync.js',
  '/utils/firebase-config.js',
  '/utils/env.js',
  '/utils/suggestions.js',
  '/utils/auth.js',
  '/utils/safety.js',
  '/utils/streaks.js',
  '/utils/celebrations.js',
  '/utils/notifications.js',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - NETWORK-FIRST strategy
// Try network first → update cache → fall back to cache if offline
self.addEventListener('fetch', event => {
  // NEVER cache Firebase / Firestore API calls — always go to network
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Got a good network response — update the cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(event.request).then(cached => {
          return cached || caches.match('/index.html');
        });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting requested');
    self.skipWaiting();
  }
});
