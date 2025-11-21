'use client';

import { useEffect } from 'react';

export default function PWAManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Request notification permission on load if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      // Wait a bit before asking for permission to avoid overwhelming the user
      setTimeout(() => {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }, 5000);
    }
  }, []);

  return null;
}
