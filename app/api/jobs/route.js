/**
 * Jobs API
 * - POST: create a pending job row and return a unique webhook_auth_token
 * - PATCH: update job_uuid after queuing with proxy
 */

import { NextResponse } from 'next/server';
import { createJob, attachJobUuid } from '@/actions/jobs';

// POST /api/jobs
export async function POST(request) {
  try {
    const payload = await request.json();
    const { id, token } = await createJob(payload || {});
    return NextResponse.json({ id, token });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: error.message }, { status: error.options?.status || 500 });
  }
}

// PATCH /api/jobs
export async function PATCH(request) {
  try {
    const { token, job_uuid } = await request.json();
    const res = await attachJobUuid({ token, job_uuid });
    return NextResponse.json(res);
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: error.message }, { status: error.options?.status || 500 });
  }
}
