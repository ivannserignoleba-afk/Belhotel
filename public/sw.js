// Service worker minimal : rend l'application installable (PWA) sans mettre
// en cache le contenu — le réseau reste maître, aucun risque de page périmée.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Passe-plat : on laisse le navigateur gérer la requête normalement.
});
