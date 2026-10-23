import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, area: string, jobTitle: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; area?: string; job_title?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-login`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from Supabase Auth on mount
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        await fetchProfile();
      } else {
        setLoading(false);
      }
    }

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) {
        await fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data as Profile);
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: 'signin' }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.error ?? 'Credenciales inválidas' };
      }

      if (data.access_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          return { error: 'Error al establecer la sesión' };
        }
        if (data.profile) {
          setProfile(data.profile as Profile);
        } else {
          await fetchProfile();
        }
        return { error: null };
      }

      return { error: 'No se recibió el token de autenticación' };
    } catch {
      return { error: 'Error de conexión. Intente nuevamente.' };
    }
  }

  async function signUp(email: string, password: string, fullName: string, area: string, jobTitle: string) {
    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: 'signup', fullName, area, jobTitle }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.error ?? 'Error al registrarse' };
      }

      // After signup, automatically sign in with the provided credentials
      return await signIn(email, password);
    } catch {
      return { error: 'Error de conexión. Intente nuevamente.' };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(updates: { full_name?: string; area?: string; job_title?: string }) {
    if (!profile) return { error: 'No hay sesión activa' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      return { error: 'Error al actualizar el perfil' };
    }

    setProfile({ ...profile, ...updates });
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
