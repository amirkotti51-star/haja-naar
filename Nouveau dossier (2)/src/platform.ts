import { createClient, type Session, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (!supabaseUrl || !supabaseAnonKey) console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl || 'https://placeholder.invalid', supabaseAnonKey || 'placeholder', { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
let session: Session | null = null;
let readyPromise: Promise<void> | null = null;

const ready = async () => {
  if (!readyPromise) readyPromise = supabase.auth.getSession().then(({ data }) => { session = data.session; });
  await readyPromise;
};
supabase.auth.onAuthStateChange((_event, next) => { session = next; });

export const auth = {
  async ready() { await ready(); },
  isSignedIn() { return Boolean(session); },
  async getUser(): Promise<{ id: string; userId: string; name: string; email: string } | null> {
    await ready();
    const u: User | null = session?.user || null;
    if (!u) return null;
    const name = String(u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'مستخدم');
    return { id: u.id, userId: u.id, name, email: u.email || '' };
  },
  async signIn() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw error;
  },
  async signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; session = null; }
};

async function request(path: string, init: RequestInit = {}) {
  await ready();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) { const message = typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : 'Request failed'; throw new Error(message); }
  return { data };
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown = {}) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown = {}) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' })
};
