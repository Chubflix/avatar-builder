/**
 * Supabase Realtime helpers
 * Subscribes to postgres_changes for specific tables and emits callbacks.
 */

import { supabase } from './supabase';

/**
 * Generic subscribe helper for a public table
 * @param {string} table - table name in public schema
 * @param {(event:{eventType:string, new?:any, old?:any, schema:string, table:string})=>void} onChange
 * @param {object} [opts]
 * @param {string} [opts.channelName] - custom channel name
 * @returns {() => void} unsubscribe function
 */
export function subscribeToTable(table, onChange, opts = {}) {
  const channelName = opts.channelName || `realtime:${table}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const record = payload.new ?? null;
          const oldRecord = payload.old ?? null;
          onChange?.({ eventType, new: record, old: oldRecord, schema: 'public', table });
        } catch (e) {
          console.warn(`[realtime:${table}] handler error`, e);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // console.debug(`[realtime:${table}] subscribed`);
      }
    });

  return () => {
    try { supabase.removeChannel(channel); } catch (_) {}
  };
}

export function subscribeToImages(onChange) {
  return subscribeToTable('images', onChange, { channelName: 'realtime:images' });
}

export function subscribeToFolders(onChange) {
  return subscribeToTable('folders', onChange, { channelName: 'realtime:folders' });
}

export function subscribeToCharacters(onChange) {
  return subscribeToTable('characters', onChange, { channelName: 'realtime:characters' });
}

export function subscribeToJobs(onChange) {
  return subscribeToTable('jobs', onChange, { channelName: 'realtime:jobs' });
}
