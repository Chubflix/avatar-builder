'use server'

import { createAuthClient } from '@/app/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import {HttpError} from "@/app/errors/HttpError";
import Unauthorized from "@/app/errors/Http/Unauthorized";
import BadRequest from "@/app/errors/Http/BadRequest";
import NotFound from "@/app/errors/Http/NotFound";

/**
 * Create a new pending job and return { id, token }
 */
export async function createJob(payload = {}) {
  const supabase = createAuthClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
      throw new HttpError('Unauthorized', 401);
  }

  const token = uuidv4();

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      webhook_auth_token: token,
      status: 'pending',
      payload: payload || {},
    })
    .select('*')
    .single();

  if (error) throw error;
  return { id: job.id, token };
}

/**
 * Attach the real job UUID to a pending job using a previously issued token.
 */
export async function attachJobUuid({ token, job_uuid } : { token?: string, job_uuid?: string }) {
  const supabase = createAuthClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
      throw new Unauthorized();
  }

  if (!token || !job_uuid) {
      throw new BadRequest('token and job_uuid are required');
  }

  const { data: updated, error } = await supabase
    .from('jobs')
    .update({ job_uuid })
    .eq('webhook_auth_token', token)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  if (!updated) {
      throw new NotFound('Job not found');
  }
  return { ok: true };
}
