import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { API_BASE_URL } from '../api/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free'); // 'free' | 'premium'
  const [loading, setLoading] = useState(true);
  const [previewFreeTier, setPreviewFreeTier] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        fetchTier(session.access_token).then(setTier).catch(() => setTier('free'));
      } else {
        setTier('free');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        try {
          const t = await fetchTier(session.access_token);
          setTier(t);
        } catch {
          setTier('free');
        }
      } else {
        setTier('free');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchTier(accessToken) {
    const res = await fetch(`${API_BASE_URL}/api/user/tier`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return 'free';
    const data = await res.json().catch(() => ({}));
    return data.tier === 'premium' ? 'premium' : 'free';
  }

  const effectiveTier = previewFreeTier ? 'free' : tier;

  const value = {
    user,
    tier: effectiveTier,
    actualTier: tier,
    loading,
    supabase,
    previewFreeTier,
    setPreviewFreeTier,
    refreshTier: () => user && supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) fetchTier(session.access_token).then(setTier);
    }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
