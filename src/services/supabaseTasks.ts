import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Task } from '../types';

/**
 * Converts a Supabase PostgreSQL snake_case row to a frontend camelCase Task
 */
export function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    originalAudioSummary: row.original_audio_summary || '',
    detectedLanguage: row.detected_language || 'English',
    transcript: row.transcript || '',
    scheduledKickoffTime: row.scheduled_kickoff_time,
    status: row.status,
    checkinDelayMinutes: Number(row.checkin_delay_minutes) || 60,
    inProgressStartedAt: row.in_progress_started_at || undefined,
    followUpScheduledTime: row.follow_up_scheduled_time || undefined,
    completedAt: row.completed_at || undefined,
    completionSource: row.completion_source || undefined,
    timeFromKickoffToComplete: row.time_from_kickoff_to_complete || undefined,
    slippedReason: row.slipped_reason || undefined,
    extensionsCount: Number(row.extensions_count) || 0,
    lastFollowUpPrompt: row.last_follow_up_prompt || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Converts a frontend camelCase Task to a Supabase snake_case insert/update payload
 */
export function mapTaskToRow(task: Partial<Task>, userId: string): any {
  const row: any = {};
  if (task.title !== undefined) row.title = task.title;
  if (task.originalAudioSummary !== undefined) row.original_audio_summary = task.originalAudioSummary;
  if (task.detectedLanguage !== undefined) row.detected_language = task.detectedLanguage;
  if (task.transcript !== undefined) row.transcript = task.transcript;
  if (task.scheduledKickoffTime !== undefined) row.scheduled_kickoff_time = task.scheduledKickoffTime;
  if (task.status !== undefined) row.status = task.status;
  if (task.checkinDelayMinutes !== undefined) row.checkin_delay_minutes = task.checkinDelayMinutes;
  if (task.inProgressStartedAt !== undefined) row.in_progress_started_at = task.inProgressStartedAt;
  if (task.followUpScheduledTime !== undefined) row.follow_up_scheduled_time = task.followUpScheduledTime;
  if (task.completedAt !== undefined) row.completed_at = task.completedAt;
  if (task.completionSource !== undefined) row.completion_source = task.completionSource;
  if (task.timeFromKickoffToComplete !== undefined) row.time_from_kickoff_to_complete = task.timeFromKickoffToComplete;
  if (task.slippedReason !== undefined) row.slipped_reason = task.slippedReason;
  if (task.extensionsCount !== undefined) row.extensions_count = task.extensionsCount;
  if (task.lastFollowUpPrompt !== undefined) row.last_follow_up_prompt = task.lastFollowUpPrompt;
  if (userId) row.user_id = userId;
  row.updated_at = new Date().toISOString();
  return row;
}

/**
 * Fetch all tasks owned by the authenticated user from Supabase (Protected by RLS)
 */
export async function supabaseFetchTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('scheduled_kickoff_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return (data || []).map(mapRowToTask);
}

/**
 * Create a new task in Supabase for the authenticated user
 */
export async function supabaseCreateTask(task: Partial<Task>): Promise<Task> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Authentication required to create a task.');
  }

  const rowPayload = mapTaskToRow(task, userData.user.id);
  if (!rowPayload.title) rowPayload.title = 'Untitled Task';
  if (!rowPayload.original_audio_summary) rowPayload.original_audio_summary = 'Voice recorded note';
  if (!rowPayload.scheduled_kickoff_time) rowPayload.scheduled_kickoff_time = new Date().toISOString();
  if (!rowPayload.status) rowPayload.status = 'PENDING';
  if (!rowPayload.checkin_delay_minutes) rowPayload.checkin_delay_minutes = 60;

  const { data, error } = await supabase
    .from('tasks')
    .insert([rowPayload])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save task to Supabase: ${error.message}`);
  }

  return mapRowToTask(data);
}

/**
 * Update an existing task in Supabase (Protected by RLS: only updates if auth.uid() = user_id)
 */
export async function supabaseUpdateTask(id: string, updates: Partial<Task>): Promise<Task> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const rowUpdates = mapTaskToRow(updates, userData?.user?.id || '');
  delete rowUpdates.user_id; // Never reassign user_id on update

  const { data, error } = await supabase
    .from('tasks')
    .update(rowUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return mapRowToTask(data);
}

/**
 * Delete a task in Supabase (Protected by RLS: only deletes if auth.uid() = user_id)
 */
export async function supabaseDeleteTask(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return true;
}
