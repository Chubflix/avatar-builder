// Lightweight Ably helper for browser and server usage
// Browser: uses NEXT_PUBLIC_ABLY_KEY
// Server: uses ABLY_API_KEY

let _realtime = null;
let _rest = null;

export function getAblyRealtime() {
  if (typeof window === 'undefined') return null;
  if (_realtime) return _realtime;
  const key = process.env.NEXT_PUBLIC_ABLY_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Ably] Missing NEXT_PUBLIC_ABLY_KEY for realtime client');
    }
    return null;
  }
  // Lazy require to avoid bundling on server
  const Ably = require('ably');
  _realtime = new Ably.Realtime(key);
  return _realtime;
}

export function getAblyRest() {
  if (_rest) return _rest;
  const key = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Ably] Missing ABLY_API_KEY for REST client');
    }
    return null;
  }
  const Ably = require('ably');
  _rest = new Ably.Rest(key);
  return _rest;
}

/**
 * Publish a realtime event to Ably (server-side only)
 * @param {string} channelName - Channel to publish to (e.g., 'images', 'folders', 'characters')
 * @param {string} eventName - Event name (e.g., 'image_deleted', 'folder_created')
 * @param {object} data - Event data
 */
export async function publishRealtimeEvent(channelName, eventName, data) {
  try {
    const ably = getAblyRest();
    if (!ably) {
      console.warn(`[Ably] Cannot publish ${channelName}:${eventName} - REST client not configured`);
      return;
    }

    const channel = ably.channels.get(channelName);
    await channel.publish(eventName, {
      timestamp: Date.now(),
      ...data
    });

    console.log(`[Ably] Published ${channelName}:${eventName}`, data);
  } catch (error) {
    // Swallow realtime errors; logging only
    console.warn(`[Ably] Failed to publish ${channelName}:${eventName}:`, error?.message || error);
  }
}
