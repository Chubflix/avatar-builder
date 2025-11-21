'use client';

import { useEffect } from 'react';

export default function PWAManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Force unregister old service workers and register new one
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('Old service worker unregistered');
        });
      });

      // Register new service worker
      setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);

            // Force immediate update check
            registration.update();

            // Check for updates frequently
            setInterval(() => {
              registration.update();
            }, 10000); // Check every 10 seconds

            // Listen for new service worker
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('New service worker activated, reloading...');
                  window.location.reload();
                }
              });
            });
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      }, 500);
    });

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Controller changed, reloading...');
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
