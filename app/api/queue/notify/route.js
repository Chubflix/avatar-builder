/**
 * API Route: POST /api/queue/notify
 * Publishes queue events via Ably (server-side)
 */

import { NextResponse } from 'next/server';
import { getAblyRest } from '@/app/lib/ably';

export async function POST(request) {
    try {
        const { eventType, data } = await request.json();

        if (!eventType) {
            return NextResponse.json(
                { error: 'eventType is required' },
                { status: 400 }
            );
        }

        // Publish via Ably REST API (server-side with full permissions)
        const ably = getAblyRest();
        if (!ably) {
            console.warn('[Queue-Notify] Ably REST client not configured');
            return NextResponse.json(
                { success: false, message: 'Ably not configured' },
                { status: 200 }
            );
        }

        const channel = ably.channels.get('queue');
        await channel.publish(eventType, {
            timestamp: Date.now(),
            ...data
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Queue-Notify] Error publishing event:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
