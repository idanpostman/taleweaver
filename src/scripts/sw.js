import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

const STORY_API_BASE_URL = 'https://story-api.dicoding.dev/v1';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ url }) =>
    url.origin === 'https://cdnjs.cloudflare.com' ||
    url.href.includes('fontawesome'),
  new CacheFirst({
    cacheName: 'fontawesome-cdn',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) => {
    const storyApiUrl = new URL(STORY_API_BASE_URL);
    return url.origin === storyApiUrl.origin && request.destination !== 'image';
  },
  new NetworkFirst({
    cacheName: 'taleweaver-story-api-data',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) => {
    const storyApiUrl = new URL(STORY_API_BASE_URL);
    return (
      (url.origin === storyApiUrl.origin && request.destination === 'image') ||
      request.destination === 'image'
    );
  },
  new StaleWhileRevalidate({
    cacheName: 'taleweaver-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// Add route for individual story saves
registerRoute(
  ({ request }) => {
    return request.url.includes('/stories/') && request.method === 'GET';
  },
  new NetworkFirst({
    cacheName: 'taleweaver-individual-stories',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationTitle = 'TaleWeaver Update';
  let notificationOptions = {
    body: 'You have a new notification from TaleWeaver!',
    icon: '/images/icons/android-chrome-192x192.png',
    badge: '/images/icons/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: { url: self.registration.scope },
  };

  if (event.data) {
    try {
      const dataFromServer = event.data.json();
      notificationTitle = dataFromServer.title || notificationTitle;

      if (dataFromServer.options) {
        notificationOptions.body =
          dataFromServer.options.body || notificationOptions.body;
        if (dataFromServer.options.icon)
          notificationOptions.icon = dataFromServer.options.icon;
        if (dataFromServer.options.badge)
          notificationOptions.badge = dataFromServer.options.badge;
        if (dataFromServer.options.data)
          notificationOptions.data = dataFromServer.options.data;
      } else if (dataFromServer.body) {
        notificationOptions.body = dataFromServer.body;
      }
    } catch (e) {
      notificationOptions.body = event.data.text() || notificationOptions.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  const clickedNotification = event.notification;
  clickedNotification.close();

  let targetUrl = self.registration.scope;
  if (clickedNotification.data && clickedNotification.data.url) {
    targetUrl = clickedNotification.data.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;

        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const absoluteClientUrl = new URL(client.url, self.location.origin)
            .href;
          if (absoluteClientUrl === absoluteTargetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
