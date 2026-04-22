import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track current session token to skip true duplicates
  const currentTokenRef = useRef<string | null>(null);
  // Track which userId we're currently fetching role for (to avoid duplicate same-user fetches)
  const fetchingForUserIdRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(async (userId: string) => {
    // If a fetch is already in-flight for the same user, skip; otherwise proceed
    if (fetchingForUserIdRef.current === userId) {
      return;
    }
    fetchingForUserIdRef.current = userId;

    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('id, company_id, full_name, email').eq('id', userId).maybeSingle(),
      ]);

      if (roleResult.error) {
        console.error('Error fetching user role:', roleResult.error);
        setUserRole(null);
      } else {
        setUserRole(roleResult.data?.role || null);
      }

      if (profileResult.data) {
        setProfile(profileResult.data as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingForUserIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        const newToken = currentSession?.access_token ?? null;

        // Skip true duplicates (same token, same event class)
        if (event === 'TOKEN_REFRESHED' && newToken === currentTokenRef.current) {
          return;
        }

        // Process all relevant auth events
        if (
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION' ||
          event === 'USER_UPDATED'
        ) {
          const previousUserId = user?.id ?? null;
          const newUserId = currentSession?.user?.id ?? null;

          currentTokenRef.current = newToken;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            // If a different user is signing in, mark loading
            if (previousUserId !== newUserId) {
              setLoading(true);
            }
            // Defer Supabase call to prevent deadlock inside the listener
            setTimeout(() => {
              fetchUserRole(currentSession.user.id);
            }, 0);
          } else {
            setUserRole(null);
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session (initial load) — covers cases where INITIAL_SESSION isn't emitted
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      currentTokenRef.current = existingSession?.access_token ?? null;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchUserRole(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserRole]);

  // signIn: authenticate AND directly hydrate state as a fallback if the listener is delayed
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session && data.user) {
      currentTokenRef.current = data.session.access_token;
      setSession(data.session);
      setUser(data.user);
      setLoading(true);
      // Fire and forget — fetch role/profile directly so navigation can happen
      fetchUserRole(data.user.id);
    }

    return { error };
  }, [fetchUserRole]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    userRole,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }), [user, session, userRole, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
