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
