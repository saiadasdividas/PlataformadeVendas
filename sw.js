const CACHE_NAME = 'plataforma-embalagens-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        self.registration.showNotification('Cache aberto', {
          body: 'Recursos prontos para uso',
          icon: '/icon-192x192.png'
        });
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retorna a resposta
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            self.registration.showNotification('Limpando cache antigo', {
              body: cacheName,
              icon: '/icon-192x192.png'
            });
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Notificações push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Plataforma Embalagens Conceito', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Abrir a aplicação
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
    event.notification.close();
  } else {
    // Ação padrão - abrir a aplicação
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implementar sincronização de dados em background
  self.registration.showNotification('Sincronização em background', {
    body: 'Dados sendo sincronizados',
    icon: '/icon-192x192.png'
  });
  return Promise.resolve();
}

// Compartilhamento
self.addEventListener('share', (event) => {
  event.waitUntil(
    // Processar dados compartilhados
    handleSharedData(event.data)
  );
});

function handleSharedData(data) {
  // Implementar processamento de dados compartilhados
  self.registration.showNotification('Dados compartilhados', {
    body: JSON.stringify(data),
    icon: '/icon-192x192.png'
  });
  return Promise.resolve();
}

