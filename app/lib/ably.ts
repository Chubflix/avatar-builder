// Lightweight Ably helper for browser and server usage (TypeScript)
// Browser: uses NEXT_PUBLIC_ABLY_KEY
// Server: uses ABLY_API_KEY

// We intentionally type Ably instances as any to avoid importing types at runtime.
let _realtime: any = null;
let _rest: any = null;

export function getAblyRealtime(): any | null {
  if (typeof window === 'undefined') return null;
  if (_realtime) return _realtime;
  const key = process.env.NEXT_PUBLIC_ABLY_KEY as string | undefined;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Ably] Missing NEXT_PUBLIC_ABLY_KEY for realtime client');
    }
    return null;
  }
  // Lazy require to avoid bundling on server
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Ably = require('ably');
  _realtime = new Ably.Realtime(key);
  return _realtime;
}

export function getAblyRest(): any | null {
  if (_rest) return _rest;
  const key = (process.env.ABLY_API_KEY as string | undefined) || (process.env.NEXT_PUBLIC_ABLY_KEY as string | undefined);
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Ably] Missing ABLY_API_KEY for REST client');
    }
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Ably = require('ably');
  _rest = new Ably.Rest(key);
  return _rest;
}

/**
 * Publish a realtime event to Ably (server-side only)
 * @param channelName - Channel to publish to (e.g., 'images', 'folders', 'characters')
 * @param eventName - Event name (e.g., 'image_deleted', 'folder_created')
 * @param data - Event data payload
 */
export async function publishRealtimeEvent(channelName: string, eventName: string, data: Record<string, any>) {
  try {
    const ably = getAblyRest();
    if (!ably) {
      console.warn(`[Ably] Cannot publish ${channelName}:${eventName} - REST client not configured`);
      return;
    }

    const channel = ably.channels.get(channelName);
    await channel.publish(eventName, {
      timestamp: Date.now(),
      ...data,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Ably] Published ${channelName}:${eventName}`, data);
    }
  } catch (error: any) {
    // Swallow realtime errors; logging only
    console.warn(`[Ably] Failed to publish ${channelName}:${eventName}:`, error?.message || error);
  }
}
