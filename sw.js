const CACHE_VERSION = 'mylore-v2';
const CACHE_CRITICAL = 'mylore-critical-v1';
const CACHE_DYNAMIC = 'mylore-dynamic-v1';

// Ressources critiques à précacher immédiatement
const CRITICAL_ASSETS = [
  '/MyLore/',
  '/MyLore/index.html',
  '/MyLore/styles.css',
  '/MyLore/app.js',
  '/MyLore/script.js',
  '/MyLore/manifest.json',
  '/MyLore/mylore.png',
  '/MyLore/firebase.js',
  '/MyLore/crud.js'
];

// Ressources à mettre en cache au premier accès
const RUNTIME_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js'
];

// ==========================================
// INSTALL - Précaching des ressources critiques
// ==========================================
self.addEventListener('install', (event) => {
  console.log('⚙️ Installation du Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_CRITICAL)
      .then((cache) => {
        console.log('📦 Précaching des ressources critiques');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Précaching terminé');
        return self.skipWaiting(); // Activer immédiatement
      })
      .catch((error) => {
        console.error('❌ Erreur lors du précaching:', error);
      })
  );
});

// ==========================================
// ACTIVATE - Nettoyage des anciens caches
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('🔄 Activation du Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Supprimer les anciens caches sauf les actuels
            if (cacheName !== CACHE_CRITICAL && 
                cacheName !== CACHE_DYNAMIC && 
                cacheName !== CACHE_VERSION) {
              console.log('🗑️ Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activé');
        return self.clients.claim(); // Prendre le contrôle immédiatement
      })
  );
});

// ==========================================
// FETCH - Stratégie de cache intelligente
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et Firebase
  if (request.method !== 'GET' || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('firestore')) {
    return;
  }

  // Stratégie Cache-First pour les ressources critiques
  if (CRITICAL_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_CRITICAL));
    return;
  }

  // Stratégie Network-First pour les CDN et ressources externes
  if (url.origin !== location.origin) {
    event.respondWith(networkFirst(request, CACHE_DYNAMIC));
    return;
  }

  // Stratégie Stale-While-Revalidate pour le reste
  event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
});

// ==========================================
// STRATÉGIES DE CACHE
// ==========================================

// Cache First: Servir depuis le cache, sinon réseau
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('📦 Depuis cache:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('❌ Erreur fetch:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First: Essayer réseau d'abord, sinon cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      console.log('🌐 Depuis réseau (mise en cache):', request.url);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('📦 Depuis cache (réseau indisponible):', request.url);
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate: Servir cache immédiatement, mettre à jour en arrière-plan
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ==========================================
// MESSAGE HANDLER - Communication avec la page
// ==========================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Activation immédiate demandée');
    self.skipWaiting();
  }

  // Commande pour vider le cache
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('🗑️ Tous les caches vidés');
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  // Commande pour obtenir la taille du cache
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      calculateCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

// ==========================================
// UTILITAIRES
// ==========================================

// Calculer la taille totale du cache
async function calculateCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// Nettoyer automatiquement les vieux caches (max 50 MB)
async function cleanOldCaches() {
  const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB
  const size = await calculateCacheSize();
  
  if (size > MAX_CACHE_SIZE) {
    console.log('🧹 Nettoyage des anciens caches...');
    const cache = await caches.open(CACHE_DYNAMIC);
    const requests = await cache.keys();
    
    // Supprimer les 10 plus anciennes entrées
    for (let i = 0; i < Math.min(10, requests.length); i++) {
      await cache.delete(requests[i]);
    }
  }
}

// Exécuter le nettoyage périodiquement
setInterval(cleanOldCaches, 30 * 60 * 1000); // Toutes les 30 minutes

console.log('✨ MyLore Service Worker chargé (version:', CACHE_VERSION, ')');