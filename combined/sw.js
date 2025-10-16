// Service Worker for PMTiles caching
const CACHE_NAME = 'pmtiles-cache-v1';
const PMTILES_HOST = 'markmclaren.github.io';

// Install event - cache essential resources
self.addEventListener('install', function(event) {
    console.log('Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            // Cache the main PMTiles files that are likely to be loaded first
            return cache.addAll([
                'https://markmclaren.github.io/Infracursions-demos/combined/pmtiles/lulc_nat_ant_1985_gpu.pmtiles',
                'https://markmclaren.github.io/Infracursions-demos/combined/pmtiles/lulc_nat_ant_1986_gpu.pmtiles'
            ]);
        })
    );
});

// Fetch event - intercept network requests
self.addEventListener('fetch', function(event) {
    // Only handle PMTiles requests from our domain
    if (event.request.url.includes(PMTILES_HOST) &&
        event.request.url.includes('.pmtiles')) {

        event.respondWith(
            caches.match(event.request).then(function(response) {
                // Return cached version if available
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }

                // Otherwise fetch from network and cache
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request).then(function(response) {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response as it can only be consumed once
                    var responseToCache = response.clone();

                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                }).catch(function(error) {
                    console.error('Service Worker: Fetch failed', error);
                    throw error;
                });
            })
        );
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activating');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline support
self.addEventListener('sync', function(event) {
    if (event.tag === 'pmtiles-sync') {
        console.log('Service Worker: Background sync');
        // Could implement background downloading of PMTiles here
    }
});

console.log('Service Worker: Loaded');
