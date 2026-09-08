import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SecondBrainMemory, MemoryCategory, ExtractedEntities } from '../types';

const LOCAL_STORAGE_MEMORIES_KEY = 'echoloop_second_brain_memories';

/**
 * Retrieve memories from localStorage (fast offline access)
 */
export function getLocalMemories(): SecondBrainMemory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Memories] Could not read local memories:', err);
    return [];
  }
}

/**
 * Persist memories to localStorage
 */
export function saveLocalMemories(memories: SecondBrainMemory[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(memories));
  } catch (err) {
    console.warn('[Memories] Could not write local memories:', err);
  }
}

/**
 * Fetch memories for the active user (from Supabase with local fallback)
 */
export async function supabaseFetchMemories(): Promise<SecondBrainMemory[]> {
  const localMemories = getLocalMemories();

  if (!isSupabaseConfigured()) {
    return localMemories;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return localMemories;
    }

    const { data, error } = await supabase
      .from('second_brain_memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Memories] Failed to fetch from Supabase:', error.message);
      return localMemories;
    }

    const mappedMemories: SecondBrainMemory[] = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      category: row.category as MemoryCategory,
      eventDate: row.event_date,
      entities: (row.extracted_entities as ExtractedEntities) || {},
      rawText: row.raw_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Merge any local guest memories that weren't yet on server if any
    const existingIds = new Set(mappedMemories.map((m) => m.id));
    const merged = [...mappedMemories];
    for (const lm of localMemories) {
      if (!existingIds.has(lm.id)) {
        merged.push(lm);
      }
    }

    saveLocalMemories(merged);
    return merged;
  } catch (err) {
    console.warn('[Memories] Supabase query exception:', err);
    return localMemories;
  }
}

/**
 * Save a new memory (to Supabase if authenticated, and to localStorage)
 */
export async function supabaseSaveMemory(input: {
  content: string;
  category: MemoryCategory;
  eventDate?: string;
  entities?: ExtractedEntities;
  rawText?: string;
}): Promise<SecondBrainMemory> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mem-${Date.now()}`;
  const now = new Date().toISOString();

  let memoryRecord: SecondBrainMemory = {
    id: newId,
    content: input.content,
    category: input.category || 'GENERAL',
    eventDate: input.eventDate,
    entities: input.entities || {},
    rawText: input.rawText || input.content,
    createdAt: now,
    updatedAt: now,
  };

  // Always update localStorage first for instantaneous UI update
  const localList = getLocalMemories();
  saveLocalMemories([memoryRecord, ...localList]);

  if (!isSupabaseConfigured()) {
    return memoryRecord;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data, error } = await supabase
        .from('second_brain_memories')
        .insert([{
          id: newId,
          user_id: userData.user.id,
          content: input.content,
          category: input.category || 'GENERAL',
          event_date: input.eventDate ? new Date(input.eventDate).toISOString() : null,
          extracted_entities: input.entities || {},
          raw_text: input.rawText || input.content,
          created_at: now,
          updated_at: now,
        }])
        .select()
        .single();

      if (!error && data) {
        memoryRecord = {
          id: data.id,
          userId: data.user_id,
          content: data.content,
          category: data.category as MemoryCategory,
          eventDate: data.event_date,
          entities: (data.extracted_entities as ExtractedEntities) || {},
          rawText: data.raw_text,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        // Update the item in local storage with the confirmed record
        const updatedLocal = getLocalMemories().map((m) => (m.id === newId ? memoryRecord : m));
        saveLocalMemories(updatedLocal);
      } else if (error) {
        console.warn('[Memories] Supabase insert warning:', error.message);
      }
    }
  } catch (err) {
    console.warn('[Memories] Supabase insert failed, retained locally:', err);
  }

  return memoryRecord;
}

/**
 * Delete a memory by ID
 */
export async function supabaseDeleteMemory(memoryId: string): Promise<boolean> {
  const localList = getLocalMemories();
  saveLocalMemories(localList.filter((m) => m.id !== memoryId));

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { error } = await supabase
        .from('second_brain_memories')
        .delete()
        .eq('id', memoryId);

      if (error) {
        console.warn('[Memories] Supabase delete warning:', error.message);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Memories] Supabase delete error:', err);
    return true;
  }
}
