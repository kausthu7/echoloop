import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TreatRecord } from '../types';

export function mapRowToTreat(row: any): TreatRecord {
  return {
    id: row.id,
    amount: Number(row.amount) || 100,
    label: row.label || 'Custom Treat',
    emoji: row.emoji || '🎁',
    customNote: row.custom_note || undefined,
    paymentMethod: row.payment_method || 'UPI',
    createdAt: row.created_at,
  };
}

/**
 * Fetch treats ledger for the authenticated user
 */
export async function supabaseFetchTreats(): Promise<TreatRecord[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('treats')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch treats: ${error.message}`);
  }

  return (data || []).map(mapRowToTreat);
}

/**
 * Log a new treat in Supabase (Protected by RLS)
 */
export async function supabaseCreateTreat(treat: Partial<TreatRecord>): Promise<TreatRecord> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Authentication required to send a treat.');
  }

  const rowPayload = {
    user_id: userData.user.id,
    amount: treat.amount || 100,
    label: treat.label || 'Custom Treat',
    emoji: treat.emoji || '🎁',
    custom_note: treat.customNote || '',
    payment_method: treat.paymentMethod || 'UPI',
  };

  const { data, error } = await supabase
    .from('treats')
    .insert([rowPayload])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create treat: ${error.message}`);
  }

  return mapRowToTreat(data);
}
