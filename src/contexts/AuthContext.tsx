import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUser, onAuthStateChange } from '../lib/auth';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'store_manager';
  store_id?: string;
  pin?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<{ error: string | null }>;
  mockLogin: (profile: UserProfile) => void;
  currentPath: string;
  navigateTo: (path: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigateTo = React.useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  const signOut = React.useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    
    try {
      localStorage.removeItem('mockProfile');
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    
    setProfile(null);
    setUser(null);
    
    try {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    } catch (e) {}

    setLoading(false);
    window.location.href = window.location.origin + '/?logout=true';
    return { error: null };
  }, []);

  const mockLogin = React.useCallback((p: UserProfile) => {
    localStorage.setItem('mockProfile', JSON.stringify(p));
    setProfile(p);
    setUser({ 
      id: p.id, 
      email: p.email,
      app_metadata: {},
      user_metadata: { name: p.name, role: p.role },
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Safety net: ensure loading screen disappears after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization safety timeout reached');
        setLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      // 1. Handle explicit logout
      if (window.location.search.includes('logout=true')) {
        try {
          localStorage.clear();
          sessionStorage.clear();
          await supabase.auth.signOut();
        } catch (e) {}
        window.history.replaceState({}, '', window.location.origin);
      }

      try {
        // 2. Priority: Check for mock profile (PIN login persistence)
        const mockProfileStr = localStorage.getItem('mockProfile');
        if (mockProfileStr) {
          try {
            const p = JSON.parse(mockProfileStr) as UserProfile;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id) || 
                           /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
            
            if (isUuid && mounted) {
              setProfile(p);
              setUser({ 
                id: p.id, 
                email: p.email,
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: { name: p.name, role: p.role }
              } as any);
              setLoading(false);
              clearTimeout(safetyTimeout);
              return; // Done
            }
          } catch (e) {
            localStorage.removeItem('mockProfile');
          }
        }

        // 3. Fallback: Check Supabase session for real email logins
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileData && mounted) {
            setProfile(profileData);
          }
        }
      } catch (e) {
        console.error('Auth boot error:', e);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes (e.g. from other tabs or session expiry)
    const { data: { subscription } } = onAuthStateChange(async (newProfile) => {
      if (!mounted) return;
      
      // Only react if we're not in mock mode or if mockProfile was just cleared
      if (!localStorage.getItem('mockProfile')) {
        if (newProfile) {
          setProfile(newProfile as UserProfile);
          setUser({ id: newProfile.id, email: newProfile.email } as any);
        } else {
          // Only clear if we were previously logged in via Supabase
          setProfile(null);
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo(() => ({ 
    user, 
    profile, 
    loading, 
    signOut, 
    mockLogin, 
    currentPath, 
    navigateTo 
  }), [user, profile, loading, signOut, mockLogin, currentPath, navigateTo]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
