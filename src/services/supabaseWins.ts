import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface WinItem {
  id: string;
  taskId: string;
  userId: string;
  title: string;
  completedAt: string;
  timeToComplete?: string;
  createdAt: string;
}

/**
 * Fetch wins for the authenticated user
 */
export async function supabaseFetchWins(): Promise<WinItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('wins')
    .select('*')
    .order('completed_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch wins from Supabase:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    title: row.title,
    completedAt: row.completed_at,
    timeToComplete: row.time_to_complete,
    createdAt: row.created_at,
  }));
}

/**
 * Record a win when a task is completed (RLS ensures user owns task_id)
 */
export async function supabaseRecordWin(taskId: string, title: string, timeToComplete?: string): Promise<WinItem | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data, error } = await supabase
    .from('wins')
    .insert([{
      task_id: taskId,
      user_id: userData.user.id,
      title,
      completed_at: new Date().toISOString(),
      time_to_complete: timeToComplete || 'Completed on time',
    }])
    .select()
    .single();

  if (error) {
    console.warn('Failed to record win in Supabase:', error.message);
    return null;
  }

  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    title: data.title,
    completedAt: data.completed_at,
    timeToComplete: data.time_to_complete,
    createdAt: data.created_at,
  };
}
