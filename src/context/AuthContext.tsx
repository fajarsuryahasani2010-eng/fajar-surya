import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppConfig, UserProfile, UserRole } from '../types';
import { apiFetch, fetchAppConfig, getStoredToken, getSupabaseClient, setStoredToken } from '../lib/api';

interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  nip?: string;
  jabatan?: string;
  role?: UserRole;
}

interface AuthContextValue {
  user: UserProfile | null;
  config: AppConfig | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (input: RegisterInput) => Promise<{ user: UserProfile; isFirstUser: boolean }>;
  logout: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await fetchAppConfig();
      setConfig(cfg);
      return cfg;
    } catch {
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await loadConfig();
      await refreshUser();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadConfig, refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<UserProfile> => {
      const res = await apiFetch<{
        user: UserProfile;
        token: string;
        session?: { access_token: string; refresh_token: string };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(res.token);
      if (config?.supabaseEnabled && res.session) {
        const sb = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
        if (sb) {
          await sb.auth.setSession({
            access_token: res.session.access_token,
            refresh_token: res.session.refresh_token,
          });
        }
      }
      setUser(res.user);
      return res.user;
    },
    [config]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<{ user: UserProfile; isFirstUser: boolean }> => {
      const res = await apiFetch<{
        user: UserProfile;
        token: string | null;
        session?: { access_token: string; refresh_token: string };
        isFirstUser: boolean;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      if (res.token) {
        setStoredToken(res.token);
      }
      if (config?.supabaseEnabled && res.session) {
        const sb = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
        if (sb) {
          await sb.auth.setSession({
            access_token: res.session.access_token,
            refresh_token: res.session.refresh_token,
          });
        }
      }
      setUser(res.user);
      await loadConfig();
      return { user: res.user, isFirstUser: res.isFirstUser };
    },
    [config, loadConfig]
  );

  const logout = useCallback(async () => {
    if (config?.supabaseEnabled) {
      const sb = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
      if (sb) {
        await sb.auth.signOut().catch(() => {});
      }
    }
    setStoredToken(null);
    setUser(null);
    await loadConfig();
  }, [config, loadConfig]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return (
    <AuthContext.Provider
      value={{
        user,
        config,
        loading,
        login,
        register,
        logout,
        refreshConfig,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
