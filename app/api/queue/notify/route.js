/**
 * API Route: POST /api/queue/notify
 * DEPRECATED: Logic moved to server action actions/queue.ts (notifyQueue)
 * This endpoint now delegates to the server action and will be removed in a future release.
 */

import { NextResponse } from 'next/server';
import { notifyQueue } from '@/actions/queue';

export async function POST(request) {
    try {
        const { eventType, data } = await request.json();

        if (!eventType) {
            return NextResponse.json(
                { error: 'eventType is required' },
                { status: 400 }
            );
        }

        // Delegate to server action (deprecated API shim)
        const result = await notifyQueue(eventType, data || {});

        const res = NextResponse.json(result.success ? { success: true } : result, { status: result.success ? 200 : 500 });
        // Mark as deprecated for clients/proxies
        res.headers.set('Deprecation', 'true');
        res.headers.set('Link', '</actions/queue.ts>; rel="successor-version"');
        res.headers.set('Warning', '299 - "POST /api/queue/notify is deprecated; use actions/queue.notifyQueue"');
        return res;
    } catch (error) {
        console.error('[Queue-Notify] Error publishing event:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
