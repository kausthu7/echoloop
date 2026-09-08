import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ReminderItem {
  id: string;
  taskId: string;
  userId: string;
  scheduledTime: string;
  type: 'KICKOFF' | 'FOLLOWUP';
  triggered: boolean;
  createdAt: string;
}

/**
 * Schedule a reminder linked to a task in Supabase
 */
export async function supabaseCreateReminder(
  taskId: string,
  scheduledTime: string,
  type: 'KICKOFF' | 'FOLLOWUP'
): Promise<ReminderItem | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data, error } = await supabase
    .from('reminders')
    .insert([{
      task_id: taskId,
      user_id: userData.user.id,
      scheduled_time: scheduledTime,
      type,
      triggered: false,
    }])
    .select()
    .single();

  if (error) {
    console.warn('Failed to create reminder in Supabase:', error.message);
    return null;
  }

  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    scheduledTime: data.scheduled_time,
    type: data.type,
    triggered: data.triggered,
    createdAt: data.created_at,
  };
}

/**
 * Mark a reminder as triggered in Supabase
 */
export async function supabaseMarkReminderTriggered(reminderId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase
    .from('reminders')
    .update({ triggered: true })
    .eq('id', reminderId);
}
