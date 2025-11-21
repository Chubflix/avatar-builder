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
 */
export async function sendNotification(message, type = 'info', dispatch, actions) {
  // Send in-app notification
  if (dispatch && actions) {
    dispatch({
      type: actions.SET_STATUS,
      payload: { message, type }
    });
  }

  // Send push notification if supported and permission granted
  if (typeof window === 'undefined') return;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Check if service worker is registered
      const registration = await navigator.serviceWorker.ready;

      // Determine notification icon and badge based on type
      const iconMap = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
      };

      const icon = iconMap[type] || iconMap.info;

      // Show notification
      await registration.showNotification('Avatar Builder', {
        body: `${icon} ${message}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: type === 'error' ? [200, 100, 200, 100, 200] : [200],
        tag: `avatar-builder-${type}`,
        requireInteraction: type === 'error',
        data: {
          type,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to show push notification:', error);
    }
  }
}

/**
 * Request notification permission from the user
 * @returns {Promise<string>} The permission status
 */
export async function requestNotificationPermission() {
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
export function areNotificationsEnabled() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}
