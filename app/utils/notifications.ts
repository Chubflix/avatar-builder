// @ts-nocheck
/**
 * Notification utility for Avatar Builder PWA
 * Handles both in-app status messages and push notifications
 */

/**
 * Send a notification (both in-app and push)
 * @param {string} message - The notification message
 * @param {string} type - Type of notification: 'success', 'error', 'info'
 * @param {Function} dispatch - Redux-like dispatch function
 * @param {Object} actions - Action types object
 * @param {boolean} notificationsEnabled - Whether push notifications are enabled (default: true)
 */
export async function sendNotification(message: string, type: 'success' | 'error' | 'info' = 'info', dispatch?: any, actions?: any, notificationsEnabled: boolean = true) {
  // Send in-app notification
  if (dispatch && actions) {
    dispatch({
      type: actions.SET_STATUS,
      payload: { message, type }
    });
  }

  // Send push notification if enabled, supported and permission granted
  if (typeof window === 'undefined' || !notificationsEnabled) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Determine notification icon and badge based on type
      const iconMap: Record<string, string> = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
      };

      const icon = iconMap[type] || iconMap.info;

      // Try to use service worker notification first, fall back to regular notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Avatar Builder', {
          body: `${icon} ${message}`,
          vibrate: type === 'error' ? [200, 100, 200, 100, 200] : [200],
          tag: `avatar-builder-${type}`,
          requireInteraction: type === 'error',
          data: {
            type,
            timestamp: Date.now()
          }
        } as any);
      } else {
        // Fallback to regular Notification API (works on localhost/development)
        new Notification('Avatar Builder', {
          body: `${icon} ${message}`,
          tag: `avatar-builder-${type}`,
          requireInteraction: type === 'error',
        } as any);
      }
    } catch (error) {
      console.error('Failed to show push notification:', error);
      // Final fallback: try basic notification
      try {
        new Notification('Avatar Builder', {
          body: message,
        } as any);
      } catch (e) {
        console.error('All notification methods failed:', e);
      }
    }
  }
}

/**
 * Request notification permission from the user
 * @returns {Promise<string>} The permission status
 */
export async function requestNotificationPermission(): Promise<string> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Check if notifications are supported and enabled
 * @returns {boolean}
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}
