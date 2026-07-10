'use client';

import { useEffect } from 'react';

// Enregistre le service worker pour rendre le site installable en application.
export default function AppSetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
