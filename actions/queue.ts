"use server";

/**
 * Server action: notifyQueue
 * Publishes a queue-related realtime event via Ably REST.
 */
import { getAblyRest } from '@/app/lib/ably';

export async function notifyQueue(
  eventType: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!eventType) {
      return { success: false, error: 'eventType is required' };
    }

    const ably = getAblyRest();
    if (!ably) {
      return { success: false, message: 'Ably not configured' };
    }

    const channel = ably.channels.get('queue');
    await channel.publish(eventType, { timestamp: Date.now(), ...data });

    return { success: true };
  } catch (error: any) {
    console.error('[Actions][notifyQueue] Error publishing event:', error);
    return { success: false, error: error?.message || 'Failed to publish queue event' };
  }
}
