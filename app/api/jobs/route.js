/**
 * Jobs API
 * - POST: create a pending job row and return a unique webhook_auth_token
 * - PATCH: update job_uuid after queuing with proxy
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/jobs
export async function POST(request) {
  try {
    const supabase = createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    // Generate a unique token for webhook auth
    const token = uuidv4();

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        webhook_auth_token: token,
        status: 'pending',
        payload: payload || {}
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: job.id, token });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/jobs
export async function PATCH(request) {
  try {
    const supabase = createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, job_uuid } = await request.json();
    if (!token || !job_uuid) {
      return NextResponse.json({ error: 'token and job_uuid are required' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('jobs')
      .update({ job_uuid })
      .eq('webhook_auth_token', token)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    if (!updated) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
