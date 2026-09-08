import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, SignUpPayload, SignInPayload } from '../types';

/**
 * Register a new user in Supabase Auth
 */
export async function supabaseSignUp(payload: SignUpPayload): Promise<{ user: UserProfile | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        name: payload.name.trim(),
        role: payload.role?.trim() || 'Founder & Creator',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('User creation failed.');
  }

  const profile: UserProfile = {
    id: data.user.id,
    name: payload.name.trim(),
    email: payload.email.trim(),
    role: payload.role?.trim() || 'Founder & Creator',
    accountType: 'STANDARD',
    createdAt: data.user.created_at || new Date().toISOString(),
  };

  return { user: profile };
}

/**
 * Authenticate existing user with email and password via Supabase
 */
export async function supabaseSignIn(payload: SignInPayload): Promise<{ user: UserProfile; error?: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(),
    password: payload.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.session) {
    throw new Error('Authentication succeeded but no session was returned.');
  }

  // Fetch full profile from profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const profile: UserProfile = {
    id: data.user.id,
    name: profileData?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
    email: data.user.email || '',
    role: profileData?.role || data.user.user_metadata?.role || 'Member',
    avatarUrl: profileData?.avatar_url || '',
    accountType: 'STANDARD',
    createdAt: profileData?.created_at || data.user.created_at || new Date().toISOString(),
  };

  return { user: profile };
}

/**
 * Sign out and clear active Supabase session
 */
export async function supabaseSignOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut().catch(() => {});
  }
}

/**
 * Retrieve current active user profile from Supabase
 */
export async function supabaseGetCurrentUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !sessionData.session.user) {
      return null;
    }

    const authUser = sessionData.session.user;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    return {
      id: authUser.id,
      name: profileData?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      role: profileData?.role || authUser.user_metadata?.role || 'Member',
      avatarUrl: profileData?.avatar_url || '',
      accountType: 'STANDARD',
      createdAt: profileData?.created_at || authUser.created_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Error fetching Supabase user:', err);
    return null;
  }
}

/**
 * Retrieve active JWT access token to send in headers to serverless functions
 */
export async function supabaseGetAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Real-time listener for Supabase authentication state changes
 */
export function onSupabaseAuthStateChange(callback: (user: UserProfile | null) => void) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    const authUser = session.user;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    callback({
      id: authUser.id,
      name: profileData?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      role: profileData?.role || authUser.user_metadata?.role || 'Member',
      avatarUrl: profileData?.avatar_url || '',
      accountType: authUser.app_metadata?.provider === 'google' ? 'GOOGLE' : 'STANDARD',
      createdAt: profileData?.created_at || authUser.created_at || new Date().toISOString(),
    });
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}

/**
 * Sign in using Google OAuth via Supabase
 */
export async function supabaseSignInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update user profile in Supabase profiles table
 */
export async function supabaseUpdateProfile(
  userId: string, 
  updates: { name?: string; role?: string; avatarUrl?: string }
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const rowUpdates: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) rowUpdates.name = updates.name.trim();
  if (updates.role !== undefined) rowUpdates.role = updates.role.trim();
  if (updates.avatarUrl !== undefined) rowUpdates.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(rowUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.warn('Failed to update profile in Supabase:', error.message);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    avatarUrl: data.avatar_url,
    accountType: 'STANDARD',
    createdAt: data.created_at,
  };
}
