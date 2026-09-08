import { UserProfile, AuthResponse, SignUpPayload, SignInPayload } from '../types';

const TOKEN_KEY = 'echoloop_auth_token';
const USER_KEY = 'echoloop_user';

/**
 * Retrieve the active bearer authentication token
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the active bearer authentication token
 */
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('Could not persist auth token to localStorage:', err);
  }
}

/**
 * Remove the active bearer authentication token
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/**
 * Retrieve cached user profile from localStorage
 */
export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persist cached user profile to localStorage
 */
export function setStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Could not persist user to localStorage:', err);
  }
}

/**
 * Clear cached user profile from localStorage
 */
export function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * Wrapper for standard fetch that automatically attaches the Authorization Bearer header
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Sign In with email and password
 */
export async function apiSignIn(payload: SignInPayload): Promise<AuthResponse> {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to sign in. Please check your credentials.');
  }

  // Persist session
  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data as AuthResponse;
}

/**
 * Sign Up with full name, email, password, and optional role
 */
export async function apiSignUp(payload: SignUpPayload): Promise<AuthResponse> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create account. Please check your details.');
  }

  // Persist session
  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data as AuthResponse;
}


/**
 * Verify current session token with the backend and retrieve fresh user profile
 */
export async function apiFetchCurrentUser(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      // Token is invalid or expired
      clearAuthToken();
      clearStoredUser();
      return null;
    }
    const data = await res.json();
    if (data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    return null;
  } catch {
    // Return cached user if network temporarily unavailable
    return getStoredUser();
  }
}

/**
 * Invalidate server session and clear local credentials
 */
export async function apiSignOut(): Promise<void> {
  try {
    await authFetch('/api/auth/signout', { method: 'POST' });
  } catch (err) {
    console.warn('Server signout notification failed:', err);
  } finally {
    clearAuthToken();
    clearStoredUser();
  }
}
